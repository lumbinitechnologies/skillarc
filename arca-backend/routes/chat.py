from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database.db import get_db
from services import chat_service
from models.schemas import ChatRequest, ChatResponse, ChatSessionOut, ChatMessageOut
from auth.dependencies import Principal, require_principal

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/ask", response_model=ChatResponse)
def ask(
    request: ChatRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_principal),
):
    try:
        result = chat_service.ask_question(
            db,
            question=request.question,
            session_id=request.session_id,
            top_k=request.top_k,
            database_context=request.database_context,
            principal=principal,
        )
        return ChatResponse(**result)
    except chat_service.SessionAccessError as e:
        raise HTTPException(status_code=404, detail="RESOURCE_NOT_FOUND") from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/ask/stream")
def ask_stream(
    request: ChatRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_principal),
    http_request: Request = None,
):
    generator = chat_service.ask_question_stream(
        db,
        question=request.question,
        session_id=request.session_id,
        top_k=request.top_k,
        database_context=request.database_context,
        principal=principal,
        request_id=getattr(getattr(http_request, "state", None), "request_id", None),
    )
    return StreamingResponse(generator, media_type="text/event-stream")


@router.get("/sessions", response_model=list[ChatSessionOut])
def get_sessions(
    db: Session = Depends(get_db), principal: Principal = Depends(require_principal)
):
    sessions = chat_service.list_sessions(db, principal)
    return [ChatSessionOut(**s.to_dict()) for s in sessions]


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageOut])
def get_session_messages(
    session_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_principal),
):
    try:
        messages = chat_service.get_session_messages(db, session_id, principal)
    except chat_service.SessionAccessError as exc:
        raise HTTPException(status_code=404, detail="RESOURCE_NOT_FOUND") from exc
    return [ChatMessageOut(**m.to_dict()) for m in messages]
