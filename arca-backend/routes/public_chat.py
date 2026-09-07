import hashlib
import json
import logging
from urllib import request as urllib_request
from urllib.error import URLError

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from auth.dependencies import require_gateway_request
from database.db import settings
from models.schemas import PublicChatRequest
from rag.groq_client import generate_public_answer_stream
from rag.public_faq import faq_context

router = APIRouter(prefix="/api/public-chat", tags=["public-chat"])
logger = logging.getLogger("arca.public_chat")

_RATE_LIMIT = 20
_WINDOW_SECONDS = 60


def _client_key(request: Request) -> str:
    # This header is set by the trusted Next.js gateway. The backend itself
    # still requires the gateway secret, so browsers cannot set this directly.
    return request.headers.get("X-Arca-Client-IP", "gateway")[:128]


def _check_rate_limit(request: Request) -> None:
    """Use shared Redis when configured; the Next gateway remains the edge guard."""
    if not settings.UPSTASH_REDIS_REST_URL or not settings.UPSTASH_REDIS_REST_TOKEN:
        return

    identity = hashlib.sha256(_client_key(request).encode("utf-8")).hexdigest()
    redis_key = f"skillarc:public-chat:{identity}"
    payload = json.dumps([
        ["INCR", redis_key],
        ["EXPIRE", redis_key, _WINDOW_SECONDS],
        ["TTL", redis_key],
    ]).encode("utf-8")
    redis_request = urllib_request.Request(
        f"{settings.UPSTASH_REDIS_REST_URL.rstrip('/')}/pipeline",
        data=payload,
        headers={
            "Authorization": f"Bearer {settings.UPSTASH_REDIS_REST_TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib_request.urlopen(redis_request, timeout=2) as response:
            if response.status >= 300:
                return
            values = json.loads(response.read().decode("utf-8"))
    except (OSError, URLError, ValueError):
        # The gateway limiter still protects the public route when Redis is
        # temporarily unavailable. Do not make the backend an outage source.
        return

    count = int(values[0].get("result", _RATE_LIMIT + 1)) if values else _RATE_LIMIT + 1
    if count > _RATE_LIMIT:
        raise HTTPException(status_code=429, detail="PUBLIC_CHAT_RATE_LIMITED")


@router.post("/ask/stream")
def ask_public_stream(
    request: PublicChatRequest,
    http_request: Request,
    _gateway_request=Depends(require_gateway_request),
):
    _check_rate_limit(http_request)
    generator = _public_sse_stream(request.question)
    return StreamingResponse(generator, media_type="text/event-stream")


def _sse_event(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


def _public_sse_stream(question: str):
    try:
        emitted = False
        for text_piece in generate_public_answer_stream(question, faq_context()):
            if not text_piece:
                continue
            emitted = True
            yield _sse_event("token", {"text": text_piece})
        if not emitted:
            yield _sse_event("token", {
                "text": "I'm having trouble reaching the assistant right now. Please try again in a moment.",
            })
        yield _sse_event("done", {})
    except Exception as exc:
        logger.exception("public chat stream failed error_type=%s", type(exc).__name__)
        yield _sse_event("error", {
            "code": "PUBLIC_CHAT_STREAM_FAILED",
            "error": "The public assistant is temporarily unavailable. Please try again shortly.",
        })
