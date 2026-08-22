import threading
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from auth.dependencies import require_gateway_request
from models.schemas import PublicChatRequest
from rag.gemini_client import generate_public_answer_stream
from rag.public_faq import faq_context

router = APIRouter(prefix="/api/public-chat", tags=["public-chat"])

_RATE_LIMIT = 20
_WINDOW_SECONDS = 60
_rate_lock = threading.Lock()
_rate_windows: dict[str, tuple[float, int]] = {}


def _client_key(request: Request) -> str:
    # This header is set by the trusted Next.js gateway. The backend itself
    # still requires the gateway secret, so browsers cannot set this directly.
    return request.headers.get("X-Arca-Client-IP", "gateway")[:128]


def _check_rate_limit(request: Request) -> None:
    now = time.monotonic()
    key = _client_key(request)
    with _rate_lock:
        window_start, count = _rate_windows.get(key, (now, 0))
        if now - window_start >= _WINDOW_SECONDS:
            window_start, count = now, 0
        if count >= _RATE_LIMIT:
            raise HTTPException(status_code=429, detail="PUBLIC_CHAT_RATE_LIMITED")
        _rate_windows[key] = (window_start, count + 1)


@router.post("/ask/stream")
def ask_public_stream(
    request: PublicChatRequest,
    http_request: Request,
    _gateway_request=Depends(require_gateway_request),
):
    _check_rate_limit(http_request)
    generator = generate_public_answer_stream(request.question, faq_context())
    return StreamingResponse(generator, media_type="text/event-stream")
