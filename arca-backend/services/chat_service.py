import json
from typing import List, Optional, Generator

from sqlalchemy.orm import Session

from models.chat import ChatSession, ChatMessage
from models.document import Document, DocumentShare
from models.query_log import QueryLog, QueryLogDocumentReference
from rag.vector_store import similarity_search
from rag.llm_client import generate_answer, generate_answer_stream
from database.db import settings
from utils.logger import get_logger
from auth.dependencies import Principal
from services.tenant_authorization import (
    RelationshipLookupError,
    authorize_document,
    resolve_relationship_scope,
)

logger = get_logger(__name__)

MAX_QUESTION_LENGTH = 4000
MAX_DATABASE_CONTEXT_LENGTH = 12000


class SessionAccessError(RuntimeError):
    """Raised when a requested session is not owned by the principal."""


def _sse_event(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


def _rollback_quietly(db: Session) -> None:
    try:
        db.rollback()
    except Exception:
        pass


def _clean_question(question: str) -> str:
    cleaned = question.strip()
    if not cleaned:
        raise ValueError("question must not be empty")
    return cleaned[:MAX_QUESTION_LENGTH]


def _bound_database_context(database_context: Optional[str]) -> Optional[str]:
    if not database_context:
        return None
    cleaned = database_context.strip()
    return cleaned[:MAX_DATABASE_CONTEXT_LENGTH] or None

from models.schemas import UserContextPayload


def get_or_create_session(
    db: Session, session_id: Optional[str], principal: Principal | None = None
) -> ChatSession:
    if session_id:
        query = db.query(ChatSession).filter(ChatSession.id == session_id)
        if principal:
            query = query.filter(
                ChatSession.owner_user_id == str(principal.user_id),
                ChatSession.institution_id == str(principal.institution_id),
            )
        session = query.first()
        if session:
            return session
        if principal:
            raise SessionAccessError("SESSION_NOT_FOUND")

    if principal is None:
        session = ChatSession(title="New Conversation")
    else:
        session = ChatSession(
            title="New Conversation",
            owner_user_id=str(principal.user_id),
            institution_id=str(principal.institution_id),
        )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _log_query(
    db: Session, question: str, chunks: List[dict], principal: Principal | None = None
) -> QueryLog:
    filenames = list({c["filename"] for c in chunks}) if chunks else []
    log = QueryLog(
        question=question,
        chunks_retrieved=len(chunks),
        successful=len(chunks) > 0,
        referenced_documents=json.dumps(filenames),
        user_id=str(principal.user_id) if principal else "",
        institution_id=str(principal.institution_id) if principal else "",
    )
    db.add(log)
    db.commit()
    if principal:
        db.add_all([
            QueryLogDocumentReference(
                query_log_id=log.id,
                institution_id=str(principal.institution_id),
                filename=filename,
            )
            for filename in filenames
        ])
        db.commit()
    return log


def _save_message(
    db: Session,
    session_id: str,
    role: str,
    content: str,
    sources: list = None,
    client_turn_id: str | None = None,
) -> ChatMessage:
    # The production schema requires sources to be a JSON array, including
    # for user messages that do not have citations. Keep the ORM write
    # contract aligned with that constraint instead of inserting SQL NULL.
    message = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        sources=json.dumps(sources or []),
        client_turn_id=client_turn_id,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def _format_sources(chunks: List[dict]) -> List[dict]:
    return [
        {
            "document_id": c["document_id"],
            "filename": c["filename"],
            "chunk_index": c["chunk_index"],
            "snippet": (c["text"][:220] + "...") if len(c["text"]) > 220 else c["text"],
            "score": round(c["score"], 4) if c.get("score") is not None else None,
        }
        for c in chunks
    ]


def ask_question(
    db: Session,
    question: str,
    session_id: Optional[str] = None,
    top_k: Optional[int] = None,
    database_context: Optional[str] = None,
    user_context: Optional[UserContextPayload] = None,
    principal: Principal | None = None,
) -> dict:
    """Full RAG query flow: retrieve -> generate -> log -> persist."""
    question = _clean_question(question)
    database_context = _bound_database_context(database_context)
    top_k = top_k or settings.DEFAULT_TOP_K
    session = get_or_create_session(db, session_id, principal)

    user_name = user_context.name if user_context else None
    user_role = user_context.role if user_context else None

    if principal:
        try:
            scope = resolve_relationship_scope(principal)
        except RelationshipLookupError as exc:
            raise RuntimeError("relationship scope unavailable") from exc
        chunks = _authorized_search(db, question, top_k, principal, scope)
    else:
        chunks = similarity_search(question, top_k=top_k)
    answer = generate_answer(
        question,
        chunks,
        database_context=database_context,
        user_name=user_name,
        user_role=user_role,
    )
    sources = _format_sources(chunks)

    _save_message(db, session.id, "user", question)
    _save_message(db, session.id, "assistant", answer, sources)
    _log_query(db, question, chunks, principal)

    # Auto-title the session from the first question
    if session.title == "New Conversation":
        session.title = question[:60] + ("..." if len(question) > 60 else "")
        db.commit()

    return {
        "session_id": session.id,
        "answer": answer,
        "sources": sources,
        "chunks_retrieved": len(chunks),
    }


def ask_question_stream(
    db: Session,
    question: str,
    session_id: Optional[str] = None,
    top_k: Optional[int] = None,
    database_context: Optional[str] = None,
    user_context: Optional[UserContextPayload] = None,
    principal: Principal | None = None,
    request_id: str | None = None,
) -> Generator[str, None, None]:
    """Streaming version: yields SSE-formatted chunks, then a final sources event."""
    try:
        question = _clean_question(question)
        database_context = _bound_database_context(database_context)
        top_k = top_k or settings.DEFAULT_TOP_K
        session = get_or_create_session(db, session_id, principal)

        user_name = user_context.name if user_context else None
        user_role = user_context.role if user_context else None

        if principal:
            scope = resolve_relationship_scope(principal)
            chunks = _authorized_search(db, question, top_k, principal, scope)
        else:
            chunks = similarity_search(question, top_k=top_k)
        sources = _format_sources(chunks)

        _save_message(db, session.id, "user", question)

        full_answer = ""
        yield _sse_event("session", {"session_id": session.id})

        for text_piece in generate_answer_stream(
            question,
            chunks,
            database_context=database_context,
            user_name=user_name,
            user_role=user_role,
        ):
            if not text_piece:
                continue
            full_answer += text_piece
            yield _sse_event("token", {"text": text_piece})

        if not full_answer:
            full_answer = "I'm having trouble reaching the assistant right now. Please try again in a moment."
            yield _sse_event("token", {"text": full_answer})

        _save_message(db, session.id, "assistant", full_answer, sources)
        _log_query(db, question, chunks, principal)

        if session.title == "New Conversation":
            session.title = question[:60] + ("..." if len(question) > 60 else "")
            db.commit()

        yield _sse_event("sources", {"sources": sources, "chunks_retrieved": len(chunks)})
        yield _sse_event("done", {})
    except SessionAccessError:
        _rollback_quietly(db)
        logger.warning("chat stream session access failed request_id=%s", request_id or "unknown")
        yield _sse_event("error", {
            "code": "SESSION_NOT_FOUND",
            "error": "This conversation is no longer available. Please start a new chat.",
        })
    except RelationshipLookupError:
        _rollback_quietly(db)
        logger.error("chat stream relationship scope failed request_id=%s", request_id or "unknown")
        yield _sse_event("error", {
            "code": "ACADEMIC_CONTEXT_UNAVAILABLE",
            "error": "I couldn't access your academic profile right now. Please try again.",
        })
    except RuntimeError as exc:
        _rollback_quietly(db)
        logger.error(
            "chat stream operational failure request_id=%s error_type=%s",
            request_id or "unknown",
            type(exc).__name__,
        )
        yield _sse_event("error", {
            "code": "CHAT_SERVICE_UNAVAILABLE",
            "error": "Arca is temporarily unavailable. Please try again shortly.",
        })
    except Exception as exc:
        _rollback_quietly(db)
        logger.exception(
            "chat stream failed request_id=%s error_type=%s",
            request_id or "unknown",
            type(exc).__name__,
        )
        yield _sse_event("error", {
            "code": "CHAT_STREAM_FAILED",
            "error": "Arca couldn't complete that response. Please try again.",
        })


def list_sessions(db: Session, principal: Principal | None = None) -> List[ChatSession]:
    query = db.query(ChatSession)
    if principal:
        query = query.filter(
            ChatSession.owner_user_id == str(principal.user_id),
            ChatSession.institution_id == str(principal.institution_id),
        )
    return query.order_by(ChatSession.created_at.desc()).all()


def get_session_messages(
    db: Session, session_id: str, principal: Principal | None = None
) -> List[ChatMessage]:
    query = db.query(ChatMessage).join(ChatSession).filter(ChatMessage.session_id == session_id)
    if principal:
        query = query.filter(
            ChatSession.owner_user_id == str(principal.user_id),
            ChatSession.institution_id == str(principal.institution_id),
        )
    messages = query.order_by(ChatMessage.created_at.asc()).all()
    if principal:
        session = (
            db.query(ChatSession)
            .filter(
                ChatSession.id == session_id,
                ChatSession.owner_user_id == str(principal.user_id),
                ChatSession.institution_id == str(principal.institution_id),
            )
            .first()
        )
        if session is None:
            raise SessionAccessError("SESSION_NOT_FOUND")
    return messages


def _chroma_where(scope) -> dict:
    clauses = [{"visibility": {"$eq": "institution"}}]
    if scope.permitted_departments:
        clauses.append({"$and": [
            {"visibility": {"$eq": "department"}},
            {"department_id": {"$in": sorted(scope.permitted_departments)}},
        ]})
    if scope.permitted_subjects:
        clauses.append({"subject_id": {"$in": sorted(scope.permitted_subjects)}})
    if scope.permitted_sections:
        clauses.append({"section_id": {"$in": sorted(scope.permitted_sections)}})
    clauses.append({"owner_id": {"$eq": scope.user_id}})
    return {"$and": [
        {"organization_id": {"$eq": scope.organization_id}},
        {"institution_id": {"$eq": scope.institution_id}},
        {"$or": clauses},
    ]}


def _authorized_search(db, question, top_k, principal, scope):
    # Resolve the authoritative operational document set before querying
    # Chroma. This includes owner/share access that cannot be represented by a
    # coarse metadata filter alone.
    candidates = (
        db.query(Document)
        .filter(
            Document.institution_id == str(scope.institution_id),
            Document.organization_id == str(scope.organization_id),
            Document.deleted_at.is_(None),
        )
        .all()
    )
    authorized_ids: list[str] = []
    for document in candidates:
        shares = db.query(DocumentShare).filter(DocumentShare.document_id == document.id).all()
        if authorize_document(principal, document, scope, shares):
            authorized_ids.append(str(document.id))

    if not authorized_ids:
        return []

    output: list[dict] = []
    for start in range(0, len(authorized_ids), 500):
        batch = authorized_ids[start : start + 500]
        where = {
            "$and": [
                {"organization_id": {"$eq": str(scope.organization_id)}},
                {"institution_id": {"$eq": str(scope.institution_id)}},
                {"document_id": {"$in": batch}},
            ]
        }
        for chunk in similarity_search(question, top_k=top_k, where=where):
            document = (
                db.query(Document)
                .filter(
                    Document.id == chunk.get("document_id"),
                    Document.institution_id == str(scope.institution_id),
                    Document.organization_id == str(scope.organization_id),
                )
                .first()
            )
            if not document:
                continue
            shares = db.query(DocumentShare).filter(DocumentShare.document_id == document.id).all()
            if authorize_document(principal, document, scope, shares):
                output.append(chunk)

    output.sort(key=lambda item: item.get("score") is not None and item.get("score") or float("-inf"), reverse=True)
    deduplicated = {}
    for chunk in output:
        key = (chunk.get("document_id"), chunk.get("chunk_index"))
        deduplicated[key] = chunk
    return list(deduplicated.values())[:top_k]
