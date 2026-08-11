from datetime import datetime
from typing import List

from sqlalchemy.orm import Session
from fastapi import UploadFile

from models.document import Document
from rag.text_extractor import extract_text, get_file_type, TextExtractionError
from rag.text_cleaner import clean_text
from rag.chunker import chunk_text
from rag.vector_store import add_chunks, delete_document_chunks
from utils.file_utils import validate_file, save_upload_file, delete_file, InvalidFileError
from database.db import settings
from utils.logger import get_logger

logger = get_logger(__name__)


async def upload_document(db: Session, file: UploadFile) -> Document:
    """Save the uploaded file to disk and create a pending Document record."""
    ext = validate_file(file)
    file_path, file_size = await save_upload_file(file, ext)

    document = Document(
        filename=file.filename,
        file_type=ext,
        file_size=file_size,
        file_path=file_path,
        processed=False,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    logger.info(f"Uploaded document {document.id} ({document.filename})")
    return document


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
        stored_count = add_chunks(document.id, document.filename, chunks)

        document.chunk_count = stored_count
        document.processed = True
        document.processing_error = None
        document.processed_at = datetime.utcnow()

    except Exception as e:
        logger.error(f"Failed to process document {document.id}: {e}")
        document.processed = False
        document.processing_error = str(e)

    db.commit()
    db.refresh(document)
    return document


def list_documents(db: Session) -> List[Document]:
    return db.query(Document).order_by(Document.uploaded_at.desc()).all()


def get_document(db: Session, document_id: str) -> Document | None:
    return db.query(Document).filter(Document.id == document_id).first()


def delete_document(db: Session, document_id: str) -> bool:
    document = get_document(db, document_id)
    if not document:
        return False

    delete_document_chunks(document.id)
    delete_file(document.file_path)

    db.delete(document)
    db.commit()

    logger.info(f"Deleted document {document_id}")
    return True


def get_document_stats(db: Session) -> dict:
    documents = db.query(Document).all()
    total_documents = len(documents)
    total_chunks = sum(d.chunk_count for d in documents)
    return {
        "total_documents": total_documents,
        "total_chunks": total_chunks,
    }
