from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from database.db import get_db
from services import document_service
from services.settings_service import get_settings
from models.schemas import DocumentOut, DocumentStats
from utils.file_utils import InvalidFileError
from rag.text_extractor import TextExtractionError

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=list[DocumentOut])
def get_documents(db: Session = Depends(get_db)):
    docs = document_service.list_documents(db)
    return [DocumentOut(**d.to_dict()) for d in docs]


@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    try:
        document = await document_service.upload_document(db, file)
    except InvalidFileError as e:
        raise HTTPException(status_code=400, detail=str(e))

    config = get_settings().get("rag_config", {})
    if config.get("auto_process_documents", True):
        try:
            document = document_service.process_document(
                db,
                document,
                chunk_size=config.get("chunk_size"),
            )
        except TextExtractionError as e:
            document.processing_error = str(e)
            db.commit()
            db.refresh(document)

    return DocumentOut(**document.to_dict())


@router.post("/{document_id}/process", response_model=DocumentOut)
def process_document(document_id: str, db: Session = Depends(get_db)):
    document = document_service.get_document(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    config = get_settings().get("rag_config", {})
    document = document_service.process_document(
        db, document, chunk_size=config.get("chunk_size")
    )
    return DocumentOut(**document.to_dict())


@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    success = document_service.delete_document(db, document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"success": True, "message": "Document deleted"}
