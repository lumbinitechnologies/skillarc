import base64
import hashlib
import hmac
import json
import time
from uuid import uuid4

import pytest
from fastapi import HTTPException
from starlette.requests import Request


SECRET = "s" * 40


def headers(payload=None, secret=SECRET, request_id=None):
    payload = payload or {
        "user_id": str(uuid4()),
        "actor_user_id": str(uuid4()),
        "organization_id": str(uuid4()),
        "institution_id": str(uuid4()),
        "department_id": None,
        "role": "STUDENT",
        "name": "Student A",
        "email": "student@example.edu",
        "is_impersonating": False,
        "issued_at": int(time.time()),
        "expires_at": int(time.time()) + 60,
    }
    encoded = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    signature = hmac.new(secret.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return {
        "X-Arca-Gateway-Secret": secret,
        "X-Arca-Principal": encoded,
        "X-Arca-Principal-Signature": signature,
        "X-Arca-Request-Id": request_id or str(uuid4()),
    }


def request_for(request_headers):
    return Request({
        "type": "http",
        "headers": [(key.lower().encode(), value.encode()) for key, value in request_headers.items()],
    })


def assert_auth_error(request_headers, status, detail):
    from auth.dependencies import require_principal

    with pytest.raises(HTTPException) as error:
        require_principal(request_for(request_headers))
    assert error.value.status_code == status
    assert error.value.detail == detail


def test_private_route_requires_gateway_secret(monkeypatch):
    monkeypatch.setenv("ARCA_BACKEND_SECRET", SECRET)
    assert_auth_error({}, 401, "AUTH_GATEWAY_SECRET_MISSING")


def test_invalid_secret_is_rejected(monkeypatch):
    monkeypatch.setenv("ARCA_BACKEND_SECRET", SECRET)
    request_headers = headers(secret="wrong-secret")
    assert_auth_error(request_headers, 401, "AUTH_GATEWAY_SECRET_INVALID")


def test_tampered_principal_and_invalid_request_id_are_rejected(monkeypatch):
    monkeypatch.setenv("ARCA_BACKEND_SECRET", SECRET)
    request_headers = headers()
    request_headers["X-Arca-Principal"] += "a"
    assert_auth_error(request_headers, 401, "AUTH_PRINCIPAL_INVALID")

    assert_auth_error(headers(request_id="not-a-uuid"), 400, "INVALID_REQUEST_ID")


def test_expired_principal_is_rejected(monkeypatch):
    monkeypatch.setenv("ARCA_BACKEND_SECRET", SECRET)
    now = int(time.time())
    payload = {
        "user_id": str(uuid4()),
        "actor_user_id": str(uuid4()),
        "organization_id": str(uuid4()),
        "institution_id": str(uuid4()),
        "department_id": None,
        "role": "STUDENT",
        "name": "Student A",
        "email": "student@example.edu",
        "is_impersonating": False,
        "issued_at": now - 120,
        "expires_at": now - 60,
    }
    assert_auth_error(headers(payload), 401, "AUTH_PRINCIPAL_INVALID")


@pytest.mark.parametrize(
    "mutation",
    [
        lambda payload: payload.update(extra="forbidden"),
        lambda payload: payload.update(role="NOT_A_ROLE"),
        lambda payload: payload.update(user_id="not-a-uuid"),
        lambda payload: payload.update(issued_at=int(time.time()) + 10),
    ],
)
def test_malformed_principal_variants_are_rejected(monkeypatch, mutation):
    monkeypatch.setenv("ARCA_BACKEND_SECRET", SECRET)
    payload = {
        "user_id": str(uuid4()),
        "actor_user_id": str(uuid4()),
        "organization_id": str(uuid4()),
        "institution_id": str(uuid4()),
        "department_id": None,
        "role": "STUDENT",
        "name": "Student A",
        "email": "student@example.edu",
        "is_impersonating": False,
        "issued_at": int(time.time()),
        "expires_at": int(time.time()) + 30,
    }
    mutation(payload)
    assert_auth_error(headers(payload), 401, "AUTH_PRINCIPAL_INVALID")


def test_malformed_base64_and_json_are_rejected(monkeypatch):
    monkeypatch.setenv("ARCA_BACKEND_SECRET", SECRET)
    request_headers = headers()
    request_headers["X-Arca-Principal"] = "%%%"
    request_headers["X-Arca-Principal-Signature"] = hmac.new(
        SECRET.encode(), b"%%%", hashlib.sha256
    ).hexdigest()
    assert_auth_error(request_headers, 401, "AUTH_PRINCIPAL_INVALID")


def test_valid_principal_is_returned_and_request_id_is_stored(monkeypatch):
    monkeypatch.setenv("ARCA_BACKEND_SECRET", SECRET)
    from auth.dependencies import require_principal

    request = request_for(headers())
    principal = require_principal(request)
    assert principal.role == "STUDENT"
    assert request.state.request_id
