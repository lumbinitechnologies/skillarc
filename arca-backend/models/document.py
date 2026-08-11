import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, DateTime, Boolean, Float

from database.db import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, docx, txt
    file_size = Column(Integer, nullable=False)  # bytes
    file_path = Column(String, nullable=False)

    chunk_count = Column(Integer, default=0)
    processed = Column(Boolean, default=False)
    processing_error = Column(String, nullable=True)

    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "chunk_count": self.chunk_count,
            "processed": self.processed,
            "processing_error": self.processing_error,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
        }
