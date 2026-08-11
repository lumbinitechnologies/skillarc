import json
from typing import List, Optional, Generator

from sqlalchemy.orm import Session

from models.chat import ChatSession, ChatMessage
from models.query_log import QueryLog
from rag.vector_store import similarity_search
from rag.gemini_client import generate_answer, generate_answer_stream
from database.db import settings
from utils.logger import get_logger

logger = get_logger(__name__)


def get_or_create_session(db: Session, session_id: Optional[str]) -> ChatSession:
    if session_id:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if session:
            return session

    session = ChatSession(title="New Conversation")
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _log_query(db: Session, question: str, chunks: List[dict]) -> QueryLog:
    filenames = list({c["filename"] for c in chunks}) if chunks else []
    log = QueryLog(
        question=question,
        chunks_retrieved=len(chunks),
        successful=len(chunks) > 0,
        referenced_documents=json.dumps(filenames),
    )
    db.add(log)
    db.commit()
    return log


def _save_message(
    db: Session, session_id: str, role: str, content: str, sources: list = None
) -> ChatMessage:
    message = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        sources=json.dumps(sources) if sources else None,
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
) -> dict:
    """Full RAG query flow: retrieve -> generate -> log -> persist."""
    top_k = top_k or settings.DEFAULT_TOP_K
    session = get_or_create_session(db, session_id)

    chunks = similarity_search(question, top_k=top_k)
    answer = generate_answer(question, chunks)
    sources = _format_sources(chunks)

    _save_message(db, session.id, "user", question)
    _save_message(db, session.id, "assistant", answer, sources)
    _log_query(db, question, chunks)

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
) -> Generator[str, None, None]:
    """Streaming version: yields SSE-formatted chunks, then a final sources event."""
    top_k = top_k or settings.DEFAULT_TOP_K
    session = get_or_create_session(db, session_id)

    chunks = similarity_search(question, top_k=top_k)
    sources = _format_sources(chunks)

    _save_message(db, session.id, "user", question)

    full_answer = ""
    yield f"event: session\ndata: {json.dumps({'session_id': session.id})}\n\n"

    for text_piece in generate_answer_stream(question, chunks):
        full_answer += text_piece
        yield f"event: token\ndata: {json.dumps({'text': text_piece})}\n\n"

    _save_message(db, session.id, "assistant", full_answer, sources)
    _log_query(db, question, chunks)

    if session.title == "New Conversation":
        session.title = question[:60] + ("..." if len(question) > 60 else "")
        db.commit()

    yield f"event: sources\ndata: {json.dumps({'sources': sources, 'chunks_retrieved': len(chunks)})}\n\n"
    yield "event: done\ndata: {}\n\n"


def list_sessions(db: Session) -> List[ChatSession]:
    return db.query(ChatSession).order_by(ChatSession.created_at.desc()).all()


def get_session_messages(db: Session, session_id: str) -> List[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
