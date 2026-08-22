import uuid
import json
from datetime import datetime

from sqlalchemy import ARRAY, Column, String, Integer, DateTime, Boolean, Text, ForeignKey, Uuid
from sqlalchemy.types import TypeDecorator

from database.db import Base


class AllowedRolesType(TypeDecorator):
    """Use Postgres text[] in production and JSON text for SQLite tests."""

    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(ARRAY(String()))
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value, dialect):
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except (TypeError, ValueError):
                value = []
        value = sorted(set(value or []))
        return value if dialect.name == "postgresql" else json.dumps(value)

    def process_result_value(self, value, dialect):
        if dialect.name == "postgresql":
            return value or []
        return value or "[]"


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Document(Base):
    __tablename__ = "documents"

    id = Column(Uuid(as_uuid=False), primary_key=True, default=generate_uuid)
    organization_id = Column(Uuid(as_uuid=False), nullable=False, index=True, default="")
    institution_id = Column(Uuid(as_uuid=False), nullable=False, index=True, default="")
    department_id = Column(Uuid(as_uuid=False), nullable=True, index=True)
    subject_id = Column(Uuid(as_uuid=False), nullable=True, index=True)
    section_id = Column(Uuid(as_uuid=False), nullable=True, index=True)
    owner_id = Column(Uuid(as_uuid=False), nullable=False, default="")
    uploaded_by = Column(Uuid(as_uuid=False), nullable=False, default="")
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, docx, txt
    file_size = Column(Integer, nullable=False)  # bytes
    file_path = Column(String, nullable=False)
    storage_path = Column(String, nullable=False, default="")
    visibility = Column(String, nullable=False, default="institution")
    allowed_roles = Column(AllowedRolesType, nullable=False, default="[]")
    status = Column(String, nullable=False, default="QUEUED")
    version = Column(Integer, nullable=False, default=1)
    deleted_at = Column(DateTime, nullable=True)

    chunk_count = Column(Integer, default=0)
    processed = Column(Boolean, default=False)
    processing_error = Column(String, nullable=True)

    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    def vector_metadata(self) -> dict[str, str | int]:
        """Canonical validated metadata mirrored to every vector chunk."""
        import json

        roles = self.allowed_roles if isinstance(self.allowed_roles, list) else json.loads(self.allowed_roles or "[]")
        return {
            "organization_id": str(self.organization_id),
            "institution_id": str(self.institution_id),
            "department_id": str(self.department_id or ""),
            "subject_id": str(self.subject_id or ""),
            "section_id": str(self.section_id or ""),
            "owner_id": str(self.owner_id),
            "visibility": str(self.visibility),
            "allowed_roles_json": json.dumps(sorted(set(roles))),
        }

    def to_dict(self):
        import json

        if isinstance(self.allowed_roles, list):
            roles = self.allowed_roles
        else:
            try:
                roles = json.loads(self.allowed_roles or "[]")
            except (TypeError, ValueError):
                roles = []
        return {
            "id": self.id,
            "organization_id": self.organization_id,
            "institution_id": self.institution_id,
            "department_id": self.department_id,
            "subject_id": self.subject_id,
            "section_id": self.section_id,
            "owner_id": self.owner_id,
            "uploaded_by": self.uploaded_by,
            "filename": self.filename,
            "file_type": self.file_type,
            "file_size": self.file_size,
            # Expose only the tenant-relative storage key. ``file_path`` is an
            # internal extraction path and may contain the server's absolute
            # filesystem location.
            "storage_path": self.storage_path,
            "visibility": self.visibility,
            "allowed_roles": roles,
            "status": self.status,
            "version": self.version,
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
            "chunk_count": self.chunk_count,
            "processed": self.processed,
            "processing_error": self.processing_error,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
        }


class DocumentShare(Base):
    __tablename__ = "document_shares"

    id = Column(Uuid(as_uuid=False), primary_key=True, default=generate_uuid)
    document_id = Column(Uuid(as_uuid=False), nullable=False, index=True)
    user_id = Column(Uuid(as_uuid=False), nullable=True, index=True)
    role = Column(String, nullable=True)
    subject_id = Column(Uuid(as_uuid=False), nullable=True)
    section_id = Column(Uuid(as_uuid=False), nullable=True)
    granted_by = Column(Uuid(as_uuid=False), nullable=False)
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class IngestionJob(Base):
    """Durable work item for document extraction and vector indexing."""

    __tablename__ = "ingestion_jobs"

    id = Column(Uuid(as_uuid=False), primary_key=True, default=generate_uuid)
    document_id = Column(Uuid(as_uuid=False), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    state = Column(String, nullable=False, default="QUEUED", index=True)
    attempt = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=5)
    available_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    lease_owner = Column(String, nullable=True, index=True)
    lease_expires_at = Column(DateTime, nullable=True, index=True)
    heartbeat_at = Column(DateTime, nullable=True)
    progress = Column(Integer, nullable=False, default=0)
    last_error = Column(Text, nullable=True)
    idempotency_key = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
