import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, Integer, Boolean, ForeignKey

from database.db import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class QueryLog(Base):
    __tablename__ = "query_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=False, default="")
    institution_id = Column(String, nullable=False, default="")
    question = Column(Text, nullable=False)
    chunks_retrieved = Column(Integer, default=0)
    successful = Column(Boolean, default=False)  # True if >=1 chunk retrieved
    referenced_documents = Column(Text, nullable=True)  # JSON-encoded list of doc filenames
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        import json

        return {
            "id": self.id,
            "question": self.question,
            "chunks_retrieved": self.chunks_retrieved,
            "successful": self.successful,
            "referenced_documents": json.loads(self.referenced_documents)
            if self.referenced_documents
            else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class QueryLogDocumentReference(Base):
    """Normalized reference facts used by bounded analytics queries."""

    __tablename__ = "query_log_document_references"

    id = Column(String, primary_key=True, default=generate_uuid)
    query_log_id = Column(String, ForeignKey("query_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(String, nullable=False, index=True)
    filename = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
