from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database.db import get_db
from services import chat_service
from models.schemas import ChatRequest, ChatResponse, ChatSessionOut, ChatMessageOut

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/ask", response_model=ChatResponse)
def ask(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        result = chat_service.ask_question(
            db,
            question=request.question,
            session_id=request.session_id,
            top_k=request.top_k,
        )
        return ChatResponse(**result)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/ask/stream")
def ask_stream(request: ChatRequest, db: Session = Depends(get_db)):
    generator = chat_service.ask_question_stream(
        db,
        question=request.question,
        session_id=request.session_id,
        top_k=request.top_k,
    )
    return StreamingResponse(generator, media_type="text/event-stream")


@router.get("/sessions", response_model=list[ChatSessionOut])
def get_sessions(db: Session = Depends(get_db)):
    sessions = chat_service.list_sessions(db)
    return [ChatSessionOut(**s.to_dict()) for s in sessions]


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageOut])
def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    messages = chat_service.get_session_messages(db, session_id)
    return [ChatMessageOut(**m.to_dict()) for m in messages]
