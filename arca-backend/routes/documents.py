import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Query
from sqlalchemy.orm import Session

from auth.dependencies import Principal, require_principal
from database.db import get_db
from models.document import DocumentShare
from models.schemas import DocumentOut
from services import document_service
from services import ingestion_service
from services.settings_service import get_settings
from services.tenant_authorization import (
    RelationshipLookupError,
    authorize_document,
    can_manage_documents,
    resolve_relationship_scope,
)
from utils.file_utils import InvalidFileError

router = APIRouter(prefix="/api/documents", tags=["documents"])


def _scope(principal: Principal):
    try:
        return resolve_relationship_scope(principal)
    except RelationshipLookupError as exc:
        raise HTTPException(status_code=502, detail="UPSTREAM_UNAVAILABLE") from exc


def _roles(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        parsed = [part.strip() for part in value.split(",") if part.strip()]
    if not isinstance(parsed, list) or any(not isinstance(role, str) for role in parsed):
        raise HTTPException(status_code=400, detail="INVALID_ALLOWED_ROLES")
    return sorted(set(parsed))


def _authorized(principal: Principal, document, db: Session, scope):
    shares = db.query(DocumentShare).filter(DocumentShare.document_id == document.id).all()
    if not authorize_document(principal, document, scope, shares):
        raise HTTPException(status_code=404, detail="RESOURCE_NOT_FOUND")
    return document


def _tenant_document(document_id: str, db: Session, principal: Principal, scope):
    document = document_service.get_tenant_document(
        db,
        document_id,
        str(scope.institution_id),
        str(scope.organization_id),
    )
    if not document:
        raise HTTPException(status_code=404, detail="RESOURCE_NOT_FOUND")
    return _authorized(principal, document, db, scope)


@router.get("", response_model=list[DocumentOut])
def get_documents(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_principal),
):
    scope = _scope(principal)
    documents = document_service.list_documents(
        db, str(scope.institution_id), str(scope.organization_id), limit, offset
    )
    return [
        DocumentOut(**document.to_dict())
        for document in documents
        if authorize_document(
            principal,
            document,
            scope,
            db.query(DocumentShare).filter(DocumentShare.document_id == document.id).all(),
        )
    ]


@router.post("/upload", response_model=DocumentOut, status_code=202)
async def upload_document(
    file: UploadFile = File(...),
    visibility: str = Form("institution"),
    department_id: str | None = Form(None),
    subject_id: str | None = Form(None),
    section_id: str | None = Form(None),
    allowed_roles: str | None = Form(None),
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_principal),
):
    if not can_manage_documents(principal):
        raise HTTPException(status_code=403, detail="AUTH_FORBIDDEN")
    if visibility not in {"institution", "department", "private"}:
        raise HTTPException(status_code=400, detail="INVALID_VISIBILITY")
    scope = _scope(principal)
    if visibility == "department" and not department_id:
        raise HTTPException(status_code=400, detail="DEPARTMENT_REQUIRED")
    unrestricted_roles = {"INSTITUTION_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"}
    if department_id and department_id not in scope.permitted_departments and principal.role not in unrestricted_roles:
        raise HTTPException(status_code=403, detail="AUTH_FORBIDDEN")
    if subject_id and subject_id not in scope.permitted_subjects and principal.role not in unrestricted_roles:
        raise HTTPException(status_code=403, detail="AUTH_FORBIDDEN")
    if section_id and section_id not in scope.permitted_sections and principal.role not in unrestricted_roles:
        raise HTTPException(status_code=403, detail="AUTH_FORBIDDEN")

    try:
        document = await document_service.upload_document(
            db,
            file,
            principal,
            visibility=visibility,
            department_id=department_id,
            subject_id=subject_id,
            section_id=section_id,
            allowed_roles=_roles(allowed_roles),
        )
    except InvalidFileError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    job = document_service.enqueue_document(db, document)
    payload = document.to_dict()
    payload["job_id"] = job.id
    return DocumentOut(**payload)


@router.post("/{document_id}/process", response_model=DocumentOut)
def process_document(
    document_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_principal),
):
    scope = _scope(principal)
    document = _tenant_document(document_id, db, principal, scope)
    job = ingestion_service.active_job(db, document.id)
    if not job:
        job = document_service.enqueue_document(db, document)
    payload = document.to_dict()
    payload["job_id"] = job.id
    return DocumentOut(**payload)


@router.get("/{document_id}/status")
def document_status(
    document_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_principal),
):
    scope = _scope(principal)
    document = _tenant_document(document_id, db, principal, scope)
    job = ingestion_service.latest_job(db, document.id)
    progress = job.progress if job else (100 if document.status == "COMPLETED" else 0)
    return {
        "document_id": document.id,
        "job_id": job.id if job else None,
        "status": job.state if job else document.status,
        "progress": progress,
        "attempt": job.attempt if job else 0,
        "max_attempts": job.max_attempts if job else 5,
        "last_error": job.last_error if job else document.processing_error,
        "updated_at": job.updated_at if job else document.processed_at or document.uploaded_at,
    }


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_principal),
):
    scope = _scope(principal)
    document = _tenant_document(document_id, db, principal, scope)
    if not (document.owner_id == str(principal.user_id) or can_manage_documents(principal)):
        raise HTTPException(status_code=403, detail="AUTH_FORBIDDEN")
    if not document_service.delete_document(
        db,
        document_id,
        institution_id=str(scope.institution_id),
        organization_id=str(scope.organization_id),
    ):
        raise HTTPException(status_code=404, detail="RESOURCE_NOT_FOUND")
    return {"document_id": document_id, "status": "CANCELLED", "deleted": True}
