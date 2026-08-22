import base64
import binascii
import hashlib
import hmac
import json
import os
import time
from typing import Literal
from uuid import UUID

from fastapi import HTTPException, Request
from pydantic import BaseModel, ConfigDict, EmailStr, ValidationError, field_validator


Role = Literal[
    "SUPER_ADMIN",
    "ORG_ADMIN",
    "INSTITUTION_ADMIN",
    "HOD",
    "PROGRAM_HEAD",
    "FACULTY",
    "STUDENT",
    "PARENT",
]


class Principal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    actor_user_id: UUID
    organization_id: UUID
    institution_id: UUID | None
    department_id: UUID | None
    role: Role
    name: str
    email: EmailStr
    is_impersonating: bool
    issued_at: int
    expires_at: int

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("name must not be blank")
        return value


def _fail(code: str, status_code: int = 401) -> None:
    raise HTTPException(status_code=status_code, detail=code)


def _decode_base64url(value: str) -> bytes:
    if not value or any(char.isspace() for char in value):
        raise ValueError("invalid base64url")
    if "=" in value:
        raise ValueError("padding is not accepted")
    padding = "=" * (-len(value) % 4)
    decoded = base64.urlsafe_b64decode((value + padding).encode("ascii"))
    if base64.urlsafe_b64encode(decoded).decode("ascii").rstrip("=") != value:
        raise ValueError("non-canonical base64url")
    return decoded


def _secret() -> str:
    return os.getenv("ARCA_BACKEND_SECRET", "")


def require_gateway_request(request: Request) -> None:
    """Verify an internal gateway request without creating a user principal.

    This is intentionally narrower than ``require_principal`` and is used
    only by the public product-help endpoint. It authenticates the Next.js
    gateway, not the browser visitor.
    """

    supplied_secret = request.headers.get("X-Arca-Gateway-Secret")
    configured_secret = _secret()
    if supplied_secret is None:
        _fail("AUTH_GATEWAY_SECRET_MISSING")
    if not configured_secret or not hmac.compare_digest(
        supplied_secret, configured_secret
    ):
        _fail("AUTH_GATEWAY_SECRET_INVALID")

    request_id = request.headers.get("X-Arca-Request-Id")
    try:
        request.state.request_id = str(UUID(request_id or ""))
    except (ValueError, AttributeError):
        _fail("INVALID_REQUEST_ID", 400)



def require_principal(request: Request) -> Principal:
    """Verify the gateway trust boundary and return the effective principal."""

    supplied_secret = request.headers.get("X-Arca-Gateway-Secret")
    configured_secret = _secret()
    if supplied_secret is None:
        _fail("AUTH_GATEWAY_SECRET_MISSING")
    if not configured_secret or not hmac.compare_digest(
        supplied_secret, configured_secret
    ):
        _fail("AUTH_GATEWAY_SECRET_INVALID")

    encoded = request.headers.get("X-Arca-Principal")
    signature = request.headers.get("X-Arca-Principal-Signature")
    if not encoded or not signature:
        _fail("AUTH_PRINCIPAL_INVALID")

    try:
        expected = hmac.new(
            configured_secret.encode("utf-8"),
            encoded.encode("ascii", errors="strict"),
            hashlib.sha256,
        ).hexdigest()
    except UnicodeError:
        _fail("AUTH_PRINCIPAL_INVALID")
    if not hmac.compare_digest(signature, expected):
        _fail("AUTH_PRINCIPAL_INVALID")

    try:
        raw = _decode_base64url(encoded)
        payload = json.loads(raw.decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("principal must be an object")
        principal = Principal.model_validate(payload)
        now = int(time.time())
        if principal.issued_at > now + 5:
            raise ValueError("principal issued in the future")
        if principal.expires_at <= principal.issued_at:
            raise ValueError("principal expiry is invalid")
        if principal.expires_at > principal.issued_at + 60:
            raise ValueError("principal lifetime is too long")
        if principal.expires_at <= now:
            raise ValueError("principal expired")
    except (ValueError, TypeError, UnicodeError, binascii.Error, json.JSONDecodeError, ValidationError):
        _fail("AUTH_PRINCIPAL_INVALID")

    request_id = request.headers.get("X-Arca-Request-Id")
    try:
        request.state.request_id = str(UUID(request_id or ""))
    except (ValueError, AttributeError):
        _fail("INVALID_REQUEST_ID", 400)

    request.state.principal = principal
    return principal
