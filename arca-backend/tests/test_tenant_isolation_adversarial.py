from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth.dependencies import Principal
from database.db import Base
from models.document import Document, DocumentShare
from services import document_service
from services.chat_service import _chroma_where
from services.tenant_authorization import (
    RelationshipLookupError,
    RelationshipScope,
    authorize_document,
    resolve_relationship_scope,
)


def make_principal(role="STUDENT", organization=None, institution=None, user=None):
    return Principal(
        user_id=user or uuid4(),
        actor_user_id=uuid4(),
        organization_id=organization or uuid4(),
        institution_id=institution or uuid4(),
        department_id=None,
        role=role,
        name="Test User",
        email="test@example.edu",
        is_impersonating=False,
        issued_at=1,
        expires_at=61,
    )


def make_scope(principal, **kwargs):
    return RelationshipScope(
        user_id=str(principal.user_id),
        organization_id=str(principal.organization_id),
        institution_id=str(principal.institution_id),
        role=principal.role,
        **kwargs,
    )


def make_document(principal, **kwargs):
    values = {
        "id": str(uuid4()),
        "organization_id": str(principal.organization_id),
        "institution_id": str(principal.institution_id),
        "owner_id": str(uuid4()),
        "uploaded_by": str(principal.user_id),
        "filename": "knowledge.txt",
        "file_type": "txt",
        "file_size": 10,
        "file_path": "/srv/uploads/file.txt",
        "storage_path": f"{principal.organization_id}/{principal.institution_id}/file.txt",
        "visibility": "institution",
        "allowed_roles": "[]",
    }
    values.update(kwargs)
    return Document(**values)


def test_students_are_isolated_by_section_and_subject():
    student_a = make_principal()
    student_scope = make_scope(
        student_a,
        permitted_subjects=frozenset({"subject-a"}),
        permitted_sections=frozenset({"section-a"}),
    )
    assert authorize_document(student_a, make_document(student_a, section_id="section-a"), student_scope)
    assert not authorize_document(student_a, make_document(student_a, section_id="section-b"), student_scope)
    assert authorize_document(student_a, make_document(student_a, subject_id="subject-a"), student_scope)
    assert not authorize_document(student_a, make_document(student_a, subject_id="subject-b"), student_scope)


def test_teacher_and_hod_relationships_are_narrow():
    teacher = make_principal("FACULTY")
    teacher_scope = make_scope(
        teacher,
        permitted_subjects=frozenset({"subject-a"}),
        permitted_sections=frozenset({"class-a"}),
    )
    assert authorize_document(teacher, make_document(teacher, subject_id="subject-a"), teacher_scope)
    assert not authorize_document(teacher, make_document(teacher, subject_id="subject-b"), teacher_scope)
    assert authorize_document(teacher, make_document(teacher, section_id="class-a"), teacher_scope)
    assert not authorize_document(teacher, make_document(teacher, section_id="class-b"), teacher_scope)

    hod = make_principal("HOD")
    hod_scope = make_scope(hod, permitted_departments=frozenset({"department-a"}))
    assert authorize_document(hod, make_document(hod, visibility="department", department_id="department-a"), hod_scope)
    assert not authorize_document(hod, make_document(hod, visibility="department", department_id="department-b"), hod_scope)


def test_parent_is_limited_to_linked_child_audience():
    parent = make_principal("PARENT")
    scope = make_scope(
        parent,
        linked_children=frozenset({"child-a"}),
        permitted_sections=frozenset({"child-a-section"}),
    )
    assert authorize_document(parent, make_document(parent, section_id="child-a-section"), scope)
    assert not authorize_document(parent, make_document(parent, section_id="child-b-section"), scope)


def test_same_role_and_admin_role_constraints_do_not_cross_tenants():
    user = make_principal("STUDENT")
    other_tenant = make_document(
        user,
        organization_id=str(uuid4()),
        institution_id=str(uuid4()),
    )
    assert not authorize_document(user, other_tenant, make_scope(user))

    institution_admin = make_principal("INSTITUTION_ADMIN")
    admin_document = make_document(
        institution_admin,
        allowed_roles='["INSTITUTION_ADMIN"]',
    )
    assert authorize_document(institution_admin, admin_document, make_scope(institution_admin))
    super_admin = make_principal(
        "SUPER_ADMIN",
        organization=institution_admin.organization_id,
        institution=institution_admin.institution_id,
    )
    assert not authorize_document(super_admin, admin_document, make_scope(super_admin))


def test_private_documents_require_owner_or_nonexpired_nonrevoked_share():
    owner = make_principal("FACULTY")
    other = make_principal(
        "FACULTY",
        organization=owner.organization_id,
        institution=owner.institution_id,
    )
    document = make_document(owner, visibility="private", owner_id=str(owner.user_id))
    scope = make_scope(other)
    assert not authorize_document(other, document, scope)

    role_share = DocumentShare(document_id=document.id, role="FACULTY", granted_by=str(owner.user_id))
    assert authorize_document(other, document, scope, [role_share])
    expired = DocumentShare(
        document_id=document.id,
        user_id=str(other.user_id),
        granted_by=str(owner.user_id),
        expires_at=datetime.utcnow() - timedelta(seconds=1),
    )
    revoked = DocumentShare(
        document_id=document.id,
        user_id=str(other.user_id),
        granted_by=str(owner.user_id),
        revoked_at=datetime.utcnow(),
    )
    assert not authorize_document(other, document, scope, [expired])
    assert not authorize_document(other, document, scope, [revoked])


def test_missing_or_malformed_scope_fails_closed():
    user = make_principal()
    document = make_document(user)
    assert not authorize_document(user, document, make_scope(user, authoritative=False))
    assert not authorize_document(user, make_document(user, allowed_roles="not-json"), make_scope(user))
    assert not authorize_document(user, make_document(user, visibility="unknown"), make_scope(user))
    assert not authorize_document(
        user,
        make_document(user, visibility="department", department_id=None),
        make_scope(user),
    )

    class MissingProvider:
        def resolve(self, principal):
            raise RelationshipLookupError("relationship data unavailable")

    with pytest.raises(RelationshipLookupError):
        resolve_relationship_scope(user, MissingProvider())


def test_client_scope_and_role_manipulation_cannot_expand_access():
    student = make_principal("STUDENT")
    scope = make_scope(student, permitted_subjects=frozenset({"subject-a"}))
    assert not authorize_document(
        student,
        make_document(student, subject_id="subject-b", allowed_roles='["SUPER_ADMIN"]'),
        scope,
    )


def test_chroma_filter_contains_both_tenant_dimensions():
    user = make_principal()
    where = _chroma_where(
        make_scope(
            user,
            permitted_subjects=frozenset({"subject-a"}),
            permitted_sections=frozenset({"section-a"}),
        )
    )
    assert {"organization_id": {"$eq": str(user.organization_id)}} in where["$and"]
    assert {"institution_id": {"$eq": str(user.institution_id)}} in where["$and"]
    assert "$in': []" not in str(where)


def test_document_vector_metadata_and_storage_key_are_scoped():
    user = make_principal()
    document = make_document(
        user,
        department_id="department-a",
        subject_id="subject-a",
        section_id="section-a",
        allowed_roles='["FACULTY", "HOD"]',
    )
    metadata = document.vector_metadata()
    assert metadata["organization_id"] == str(user.organization_id)
    assert metadata["institution_id"] == str(user.institution_id)
    assert metadata["department_id"] == "department-a"
    assert metadata["subject_id"] == "subject-a"
    assert metadata["section_id"] == "section-a"
    assert metadata["owner_id"] == document.owner_id
    assert metadata["visibility"] == "institution"
    assert metadata["allowed_roles_json"] == '["FACULTY", "HOD"]'
    assert document.storage_path == (
        f"{user.organization_id}/{user.institution_id}/file.txt"
    )


@pytest.fixture
def document_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_document_list_load_and_delete_are_tenant_filtered(document_db):
    owner = make_principal("FACULTY")
    other_org = uuid4()
    visible = make_document(owner)
    foreign = make_document(owner, organization_id=str(other_org))
    document_db.add_all([visible, foreign])
    document_db.commit()

    listed = document_service.list_documents(
        document_db, str(owner.institution_id), str(owner.organization_id)
    )
    assert [item.id for item in listed] == [visible.id]
    assert document_service.get_tenant_document(
        document_db, foreign.id, str(owner.institution_id), str(owner.organization_id)
    ) is None
    assert not document_service.delete_document(
        document_db,
        foreign.id,
        institution_id=str(owner.institution_id),
        organization_id=str(owner.organization_id),
    )
