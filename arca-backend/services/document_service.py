from datetime import datetime
import json
import uuid
from typing import List

from sqlalchemy.orm import Session
from fastapi import UploadFile

from models.document import Document
from rag.text_extractor import extract_text, get_file_type, TextExtractionError
from rag.text_cleaner import clean_text
from rag.chunker import chunk_text
from rag.vector_store import add_chunks, delete_document_chunks
from utils.file_utils import validate_file, save_upload_file, storage_path, delete_file, InvalidFileError
from database.db import settings
from utils.logger import get_logger

logger = get_logger(__name__)


def document_is_cancelled(db: Session, document_id: str) -> bool:
    document = db.query(Document).filter(Document.id == document_id).first()
    return not document or document.deleted_at is not None or document.status == "CANCELLED"


async def upload_document(
    db: Session,
    file: UploadFile,
    principal,
    visibility: str = "institution",
    department_id: str | None = None,
    subject_id: str | None = None,
    section_id: str | None = None,
    allowed_roles: list[str] | None = None,
) -> Document:
    """Save the uploaded file to disk and create a pending Document record."""
    ext = validate_file(file)
    document_id = str(uuid.uuid4())
    file_path, file_size = await save_upload_file(
        file,
        ext,
        str(principal.institution_id),
        document_id,
        organization_id=str(principal.organization_id),
    )

    document = Document(
        id=document_id,
        organization_id=str(principal.organization_id),
        institution_id=str(principal.institution_id),
        department_id=department_id,
        subject_id=subject_id,
        section_id=section_id,
        owner_id=str(principal.user_id),
        uploaded_by=str(principal.user_id),
        filename=file.filename,
        file_type=ext,
        file_size=file_size,
        file_path=file_path,
        storage_path=storage_path(
            str(principal.organization_id), str(principal.institution_id), document_id, ext
        ),
        visibility=visibility,
        allowed_roles=json.dumps(sorted(set(allowed_roles or []))),
        status="QUEUED",
        processed=False,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    logger.info("Document upload accepted id=%s status=%s", document.id, document.status)
    return document


def enqueue_document(db: Session, document: Document):
    from services.ingestion_service import enqueue

    return enqueue(db, document)


def process_document(
    db: Session,
    document: Document,
    chunk_size: int = None,
    chunk_overlap: int = None,
) -> Document:
    """Run the full RAG ingestion pipeline: extract -> clean -> chunk -> embed -> store."""
    chunk_size = chunk_size or settings.DEFAULT_CHUNK_SIZE
    chunk_overlap = chunk_overlap or settings.DEFAULT_CHUNK_OVERLAP

    try:
        raw_text = extract_text(document.file_path, document.file_type)
        cleaned = clean_text(raw_text)

        if not cleaned:
            raise TextExtractionError(
                "No extractable text found in this document (it may be scanned/image-only)."
            )

        chunks = chunk_text(cleaned, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        stored_count = add_chunks(
            document.id,
            document.filename,
            chunks,
            metadata=document.vector_metadata(),
            document_version=document.version,
        )

        document.chunk_count = stored_count
        document.processed = True
        document.status = "COMPLETED"
        document.processing_error = None
        document.processed_at = datetime.utcnow()

    except Exception as e:
        logger.error("Document processing failed id=%s error_type=%s", document.id, type(e).__name__)
        document.processed = False
        document.status = "FAILED"
        document.processing_error = str(e)

    db.commit()
    db.refresh(document)
    return document


def list_documents(
    db: Session,
    institution_id: str,
    organization_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Document]:
    query = db.query(Document).filter(
        Document.institution_id == institution_id,
        Document.deleted_at.is_(None),
    )
    if organization_id is not None:
        query = query.filter(Document.organization_id == organization_id)
    return (
        query.order_by(Document.uploaded_at.desc())
        .offset(max(0, int(offset)))
        .limit(max(1, min(int(limit), 100)))
        .all()
    )


def get_document(db: Session, document_id: str) -> Document | None:
    return db.query(Document).filter(Document.id == document_id).first()


def get_tenant_document(
    db: Session, document_id: str, institution_id: str, organization_id: str
) -> Document | None:
    """Load a document only inside the verified tenant boundary."""
    return (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.institution_id == institution_id,
            Document.organization_id == organization_id,
        )
        .first()
    )


def delete_document(
    db: Session,
    document_id: str,
    institution_id: str | None = None,
    organization_id: str | None = None,
) -> bool:
    document = (
        get_tenant_document(db, document_id, institution_id, organization_id)
        if institution_id is not None and organization_id is not None
        else get_document(db, document_id)
    )
    if not document:
        return False

    from services.ingestion_service import cancel_document_jobs

    document.deleted_at = datetime.utcnow()
    document.status = "CANCELLED"
    db.add(document)
    cancel_document_jobs(db, document.id)
    db.commit()

    delete_document_chunks(document.id)
    delete_file(document.file_path)

    logger.info("Document deletion completed id=%s", document_id)
    return True


def get_document_stats(db: Session) -> dict:
    from sqlalchemy import func
    total_documents, total_chunks = db.query(
        func.count(Document.id),
        func.coalesce(func.sum(Document.chunk_count), 0),
    ).filter(Document.deleted_at.is_(None)).one()
    return {
        "total_documents": int(total_documents or 0),
        "total_chunks": int(total_chunks or 0),
    }
