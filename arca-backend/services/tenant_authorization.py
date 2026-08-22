"""Relationship resolution and the single document authorization predicate.

The provider boundary deliberately fails closed. Supabase is authoritative for
academic relationships; operational Postgres only stores Arca documents and
shares.
"""

import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Protocol

import httpx

from auth.dependencies import Principal
from models.document import Document, DocumentShare


class RelationshipLookupError(RuntimeError):
    pass


class DocumentAuthorizationError(ValueError):
    """Raised internally when persisted scope metadata is invalid."""


@dataclass(frozen=True)
class RelationshipScope:
    user_id: str
    institution_id: str
    organization_id: str
    role: str
    permitted_departments: frozenset[str] = field(default_factory=frozenset)
    permitted_subjects: frozenset[str] = field(default_factory=frozenset)
    permitted_sections: frozenset[str] = field(default_factory=frozenset)
    linked_children: frozenset[str] = field(default_factory=frozenset)
    authoritative: bool = True
    allow_cross_institution: bool = False


class RelationshipProvider(Protocol):
    def resolve(self, principal: Principal) -> RelationshipScope:
        ...


def _ids(rows: list[dict[str, Any]], key: str) -> set[str]:
    return {str(row[key]) for row in rows if row.get(key)}


class SupabaseRelationshipProvider:
    """Small REST adapter for the live public schema.

    The service-role key is read only on the backend. A missing configuration
    is an operational dependency failure, never an empty authorization scope.
    """

    def __init__(self, base_url: str | None = None, service_key: str | None = None):
        self.base_url = (base_url or os.getenv("SUPABASE_URL", "")).rstrip("/")
        self.service_key = service_key or os.getenv("SUPABASE_SECRET_KEY") or os.getenv(
            "SUPABASE_SERVICE_ROLE_KEY", ""
        )
        self.uses_new_secret_key = self.service_key.startswith("sb_secret_")
        if not self.base_url or not self.service_key:
            raise RelationshipLookupError("Supabase relationship provider is not configured")

    def _select(self, table: str, select: str, **filters: str) -> list[dict[str, Any]]:
        params: dict[str, str] = {"select": select}
        for key, value in filters.items():
            params[key] = f"eq.{value}"
        try:
            headers = {"apikey": self.service_key}
            # Legacy service_role keys are JWTs and are accepted as bearer
            # credentials. New sb_secret keys are opaque API keys and must not
            # be presented as bearer tokens.
            if not self.uses_new_secret_key:
                headers["Authorization"] = f"Bearer {self.service_key}"
            response = httpx.get(
                f"{self.base_url}/rest/v1/{table}",
                params=params,
                headers=headers,
                timeout=5.0,
            )
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, list):
                raise RelationshipLookupError(f"invalid {table} response")
            return data
        except (httpx.HTTPError, ValueError) as exc:
            raise RelationshipLookupError(f"Supabase lookup failed for {table}") from exc

    def resolve(self, principal: Principal) -> RelationshipScope:
        profiles = self._select(
            "users",
            "id,organization_id,institution_id,department_id,role,is_active",
            id=str(principal.user_id),
        )
        if len(profiles) != 1 or not profiles[0].get("is_active"):
            raise RelationshipLookupError("active principal profile was not found")
        profile = profiles[0]
        if str(profile.get("organization_id")) != str(principal.organization_id):
            raise RelationshipLookupError("principal organization mismatch")
        if principal.institution_id and str(profile.get("institution_id")) != str(principal.institution_id):
            raise RelationshipLookupError("principal institution mismatch")

        institution_id = str(profile.get("institution_id") or principal.institution_id or "")
        if not institution_id:
            raise RelationshipLookupError("principal has no institution")
        departments: set[str] = set()
        subjects: set[str] = set()
        sections: set[str] = set()
        children: set[str] = set()

        role = str(profile.get("role"))
        department_id = profile.get("department_id")
        if role in {"FACULTY"}:
            assignments = self._select(
                "faculty_subjects",
                "subject_id,section_id",
                faculty_id=str(principal.user_id),
                institution_id=institution_id,
            )
            subjects.update(_ids(assignments, "subject_id"))
            sections.update(_ids(assignments, "section_id"))
            if department_id:
                departments.add(str(department_id))
        elif role in {"HOD", "PROGRAM_HEAD"}:
            if not department_id:
                raise RelationshipLookupError("department-scoped principal has no department")
            dept = self._select("departments", "id", id=str(department_id), institution_id=institution_id)
            if len(dept) != 1:
                raise RelationshipLookupError("principal department is not in institution")
            departments.add(str(department_id))
            programs = self._select("programs", "id", institution_id=institution_id, department_id=str(department_id))
            program_ids = _ids(programs, "id")
            if program_ids:
                subjects.update(_ids(self._select("subjects", "id", institution_id=institution_id), "id") & program_ids)
        elif role == "STUDENT":
            students = self._select(
                "students",
                "institution_id,program_id,section_id,semester",
                id=str(principal.user_id),
            )
            if len(students) != 1 or str(students[0].get("institution_id")) != institution_id:
                raise RelationshipLookupError("student placement is unavailable")
            student = students[0]
            if student.get("section_id"):
                sections.add(str(student["section_id"]))
            if student.get("program_id"):
                programs = {str(student["program_id"])}
                enrolments = self._select(
                    "enrolments",
                    "program_id",
                    student_id=str(principal.user_id),
                    institution_id=institution_id,
                )
                programs.update(_ids(enrolments, "program_id"))
                subject_rows = self._select("subjects", "id,program_id,semester", institution_id=institution_id)
                for row in subject_rows:
                    if str(row.get("program_id")) in programs and (
                        student.get("semester") is None or row.get("semester") == student.get("semester")
                    ):
                        subjects.add(str(row["id"]))
                program_rows = self._select("programs", "id,department_id", institution_id=institution_id)
                departments.update(
                    str(row["department_id"])
                    for row in program_rows
                    if str(row.get("id")) in programs and row.get("department_id")
                )
        elif role == "PARENT":
            links = self._select("parent_student_relations", "student_id", parent_id=str(principal.user_id))
            children.update(_ids(links, "student_id"))
            if not children:
                raise RelationshipLookupError("parent has no linked children")
            for child_id in children:
                child_rows = self._select("students", "institution_id,program_id,section_id,semester", id=child_id)
                if len(child_rows) != 1 or str(child_rows[0].get("institution_id")) != institution_id:
                    raise RelationshipLookupError("linked child is outside the principal institution")
                child = child_rows[0]
                if child.get("section_id"):
                    sections.add(str(child["section_id"]))
                if child.get("program_id"):
                    subject_rows = self._select("subjects", "id,program_id,semester", institution_id=institution_id)
                    subjects.update(
                        str(row["id"])
                        for row in subject_rows
                        if str(row.get("program_id")) == str(child["program_id"])
                        and (child.get("semester") is None or row.get("semester") == child.get("semester"))
                    )
        elif role in {"INSTITUTION_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"}:
            # Administrative document targeting is still limited to the
            # verified institution. Resolve the target IDs from authority so
            # a client cannot invent an audience UUID.
            departments.update(_ids(self._select("departments", "id", institution_id=institution_id), "id"))
            subjects.update(_ids(self._select("subjects", "id", institution_id=institution_id), "id"))
            sections.update(_ids(self._select("sections", "id", institution_id=institution_id), "id"))

        return RelationshipScope(
            user_id=str(principal.user_id),
            institution_id=institution_id,
            organization_id=str(principal.organization_id),
            role=role,
            permitted_departments=frozenset(departments),
            permitted_subjects=frozenset(subjects),
            permitted_sections=frozenset(sections),
            linked_children=frozenset(children),
        )


def resolve_relationship_scope(principal: Principal, provider: RelationshipProvider | None = None) -> RelationshipScope:
    provider = provider or SupabaseRelationshipProvider()
    try:
        return provider.resolve(principal)
    except RelationshipLookupError:
        raise
    except Exception as exc:
        raise RelationshipLookupError("relationship provider unavailable") from exc


def _allowed_roles(document: Document) -> set[str]:
    if isinstance(document.allowed_roles, (list, tuple, set)):
        roles = list(document.allowed_roles)
    else:
        try:
            roles = json.loads(document.allowed_roles or "[]")
        except (TypeError, ValueError) as exc:
            raise DocumentAuthorizationError("invalid allowed_roles metadata") from exc
    if not isinstance(roles, list) or any(not isinstance(role, str) or not role for role in roles):
        raise DocumentAuthorizationError("invalid allowed_roles metadata")
    return set(roles)


def active_share_matches(
    principal: Principal,
    document: Document,
    shares: list[DocumentShare],
    scope: RelationshipScope,
) -> bool:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for share in shares:
        if share.document_id != document.id or share.revoked_at is not None:
            continue
        if share.expires_at is not None and share.expires_at <= now:
            continue
        if share.user_id and share.user_id == str(principal.user_id):
            return True
        if share.role and share.role == principal.role:
            return True
        if share.subject_id and share.subject_id in scope.permitted_subjects:
            return True
        if share.section_id and share.section_id in scope.permitted_sections:
            return True
    return False


def authorize_document(
    principal: Principal,
    document: Document,
    scope: RelationshipScope,
    shares: list[DocumentShare] | None = None,
) -> bool:
    try:
        if not scope.authoritative:
            return False
        if document.deleted_at is not None:
            return False
        if not document.organization_id or str(document.organization_id) != str(scope.organization_id):
            return False
        if not document.institution_id or str(document.institution_id) != str(scope.institution_id):
            return False
        if document.visibility not in {"institution", "department", "private"}:
            return False
        if document.visibility == "department" and not document.department_id:
            return False
        roles = _allowed_roles(document)
        if roles and principal.role not in roles:
            return False
    except (AttributeError, DocumentAuthorizationError, TypeError):
        return False

    share_match = active_share_matches(principal, document, shares or [], scope)
    owner_match = str(document.owner_id) == str(principal.user_id)
    if document.visibility == "private":
        return owner_match or share_match
    if owner_match or share_match:
        return True
    if document.visibility == "department":
        return bool(document.department_id and document.department_id in scope.permitted_departments)
    audience_ids = [document.department_id, document.subject_id, document.section_id]
    if document.department_id and document.department_id in scope.permitted_departments:
        return True
    if document.subject_id and document.subject_id in scope.permitted_subjects:
        return True
    if document.section_id and document.section_id in scope.permitted_sections:
        return True
    # Institution-wide material is broad only when it carries no narrower
    # audience marker. A marker turns it into relationship-scoped material.
    return document.visibility == "institution" and not any(audience_ids)


def can_manage_documents(principal: Principal) -> bool:
    return principal.role in {"FACULTY", "HOD", "PROGRAM_HEAD", "INSTITUTION_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"}
