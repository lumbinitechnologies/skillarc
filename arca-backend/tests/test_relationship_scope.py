from datetime import datetime, timedelta
from uuid import uuid4

from auth.dependencies import Principal
from models.document import Document, DocumentShare
from services.tenant_authorization import (
    RelationshipScope,
    SupabaseRelationshipProvider,
    authorize_document,
)


def principal(role="STUDENT", institution=None, user=None):
    institution = institution or str(uuid4())
    return Principal(
        user_id=user or uuid4(),
        actor_user_id=uuid4(),
        organization_id=uuid4(),
        institution_id=institution,
        department_id=None,
        role=role,
        name="Test User",
        email="test@example.edu",
        is_impersonating=False,
        issued_at=1,
        expires_at=61,
    )


def document(p, **kwargs):
    values = dict(
        id=str(uuid4()),
        organization_id=str(p.organization_id),
        institution_id=str(p.institution_id),
        owner_id=str(uuid4()),
        uploaded_by=str(uuid4()),
        filename="doc.txt",
        file_type="txt",
        file_size=10,
        file_path="uploads/doc.txt",
        storage_path="uploads/doc.txt",
        visibility="institution",
        allowed_roles="[]",
    )
    values.update(kwargs)
    return Document(**values)


def scope(p, **kwargs):
    return RelationshipScope(
        user_id=str(p.user_id),
        institution_id=str(p.institution_id),
        organization_id=str(p.organization_id),
        role=p.role,
        **kwargs,
    )


def test_cross_institution_is_denied_even_for_same_role():
    p = principal()
    d = document(p, institution_id=str(uuid4()))
    assert not authorize_document(p, d, scope(p))


def test_subject_and_section_relationships_are_enforced():
    p = principal()
    permitted = scope(p, permitted_subjects=frozenset({"subject-a"}), permitted_sections=frozenset({"section-a"}))
    assert authorize_document(p, document(p, subject_id="subject-a"), permitted)
    assert not authorize_document(p, document(p, subject_id="subject-b"), permitted)
    assert authorize_document(p, document(p, section_id="section-a"), permitted)
    assert not authorize_document(p, document(p, section_id="section-b"), permitted)


def test_private_documents_require_owner_or_active_share():
    p = principal(role="FACULTY")
    d = document(p, visibility="private")
    assert not authorize_document(p, d, scope(p))
    share = DocumentShare(document_id=d.id, user_id=str(p.user_id), granted_by=str(uuid4()))
    assert authorize_document(p, d, scope(p), [share])
    expired = DocumentShare(
        document_id=d.id,
        user_id=str(p.user_id),
        granted_by=str(uuid4()),
        expires_at=datetime.utcnow() - timedelta(seconds=1),
    )
    assert not authorize_document(p, d, scope(p), [expired])


def test_department_and_parent_child_scopes_do_not_broaden_access():
    p = principal(role="HOD")
    hod_scope = scope(p, permitted_departments=frozenset({"dept-cse"}))
    assert authorize_document(p, document(p, visibility="department", department_id="dept-cse"), hod_scope)
    assert not authorize_document(p, document(p, visibility="department", department_id="dept-ee"), hod_scope)

    parent = principal(role="PARENT")
    parent_scope = scope(parent, linked_children=frozenset({"student-a"}), permitted_sections=frozenset({"section-a"}))
    assert authorize_document(parent, document(parent, section_id="section-a"), parent_scope)
    assert not authorize_document(parent, document(parent, section_id="section-b"), parent_scope)


def test_new_supabase_secret_key_is_read_without_bearer_header(monkeypatch):
    captured = {}

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return [{"id": "user-a", "is_active": True}]

    def fake_get(*args, **kwargs):
        captured.update(kwargs["headers"])
        return Response()

    monkeypatch.setattr("services.tenant_authorization.httpx.get", fake_get)
    provider = SupabaseRelationshipProvider(
        base_url="https://authority.example",
        service_key="sb_secret_test",
    )
    assert provider._select("users", "id") == [{"id": "user-a", "is_active": True}]
    assert captured == {"apikey": "sb_secret_test"}
