"""Worker entrypoint: ``python -m worker.main``."""

import os
import time
import uuid

from database.db import SessionLocal
from database.init_db import init_db
from models.document import Document
from rag.text_cleaner import clean_text
from rag.text_extractor import TextExtractionError, extract_text
from rag.chunker import chunk_text
from rag.vector_store import add_chunks
from services import ingestion_service
from services.document_service import document_is_cancelled
from database.db import settings
from utils.logger import get_logger

logger = get_logger(__name__)


def run_job(db, job, lease_owner: str) -> None:
    document = db.query(Document).filter(Document.id == job.document_id).first()
    if not document or document.deleted_at or job.state == "CANCELLED":
        ingestion_service.cancel_document_jobs(db, job.document_id)
        return
    try:
        raw = extract_text(document.file_path, document.file_type)
        text = clean_text(raw)
        if not text:
            raise TextExtractionError("No extractable text found in this document.")
        ingestion_service.transition(db, job, "CHUNKING", lease_owner=lease_owner)
        db.commit()
        chunks = chunk_text(text, chunk_size=settings.DEFAULT_CHUNK_SIZE, chunk_overlap=settings.DEFAULT_CHUNK_OVERLAP)
        ingestion_service.transition(db, job, "EMBEDDING", lease_owner=lease_owner)
        db.commit()
        db.refresh(document)
        if document_is_cancelled(db, document.id):
            ingestion_service.transition(db, job, "CANCELLED", lease_owner=lease_owner)
            db.commit()
            return
        count = add_chunks(document.id, document.filename, chunks, metadata=document.vector_metadata(), document_version=document.version)
        document.chunk_count = count
        document.processed = True
        document.status = "COMPLETED"
        document.processing_error = None
        ingestion_service.transition(db, job, "COMPLETED", lease_owner=lease_owner)
        document.processed_at = __import__("datetime").datetime.utcnow()
        db.commit()
    except Exception as exc:
        logger.error("Ingestion job %s failed: %s", job.id, exc)
        ingestion_service.fail_or_retry(db, job, str(exc), retryable=not isinstance(exc, TextExtractionError))
        document.status = "FAILED" if job.state == "FAILED" else "QUEUED"
        document.processing_error = str(exc)
        db.commit()


def run_once(lease_owner: str | None = None) -> bool:
    owner = lease_owner or str(uuid.uuid4())
    db = SessionLocal()
    try:
        job = ingestion_service.claim(db, owner)
        if not job:
            return False
        run_job(db, job, owner)
        return True
    finally:
        db.close()


def main() -> None:
    init_db()
    poll_seconds = float(os.getenv("INGESTION_POLL_SECONDS", "2"))
    while True:
        if not run_once():
            time.sleep(poll_seconds)


if __name__ == "__main__":
    main()
