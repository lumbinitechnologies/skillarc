from services.chat_service import _chroma_where
from services.tenant_authorization import RelationshipScope


def test_chroma_filter_always_contains_institution_and_nonempty_audience_clauses():
    scope = RelationshipScope(
        user_id="student-a",
        institution_id="inst-a",
        organization_id="org-a",
        role="STUDENT",
        permitted_departments=frozenset({"dept-cse"}),
        permitted_subjects=frozenset({"subject-cs101"}),
        permitted_sections=frozenset({"section-a"}),
    )
    where = _chroma_where(scope)
    assert {"institution_id": {"$eq": "inst-a"}} in where["$and"]
    serialized = str(where)
    assert "dept-cse" in serialized
    assert "subject-cs101" in serialized
    assert "section-a" in serialized
    assert "$in': []" not in serialized
