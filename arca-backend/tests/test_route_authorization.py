from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.routing import APIRoute
from pydantic import ValidationError

from auth.dependencies import Principal, require_principal
from main import app
from models.schemas import ChatRequest, RagConfig
from routes import settings as settings_routes


def make_principal(role: str = "STUDENT") -> Principal:
    return Principal(
        user_id=uuid4(),
        actor_user_id=uuid4(),
        organization_id=uuid4(),
        institution_id=uuid4(),
        department_id=None,
        role=role,
        name="Test User",
        email="test@example.edu",
        is_impersonating=False,
        issued_at=1,
        expires_at=61,
    )


def _contains_principal_dependency(route: APIRoute) -> bool:
    return any(dependency.call is require_principal for dependency in route.dependant.dependencies)


def test_every_non_public_route_requires_principal():
    public = {("GET", "/"), ("GET", "/api/health")}
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        if any((method, route.path) not in public for method in route.methods):
            assert _contains_principal_dependency(route), route.path


def test_chat_body_cannot_inject_identity_fields():
    with pytest.raises(ValidationError):
        ChatRequest(question="hello", role="SUPER_ADMIN")
    with pytest.raises(ValidationError):
        ChatRequest(question="hello", institution_id=str(uuid4()))


def test_student_cannot_use_destructive_settings_route():
    with pytest.raises(HTTPException) as error:
        settings_routes.clear_database(db=object(), principal=make_principal("STUDENT"))
    assert error.value.status_code == 403
    assert error.value.detail == "AUTH_FORBIDDEN"


def test_student_cannot_change_rag_configuration():
    config = RagConfig(
        auto_process_documents=True,
        show_source_citations=True,
        top_k_retrieval=4,
        chunk_size=1000,
    )
    with pytest.raises(HTTPException) as error:
        settings_routes.update_rag_config(config, make_principal("STUDENT"))
    assert error.value.status_code == 403
    assert error.value.detail == "AUTH_FORBIDDEN"
