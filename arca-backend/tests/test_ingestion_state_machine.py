from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database.db import Base
from models.document import Document, IngestionJob
from services import ingestion_service


@pytest.fixture
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def make_document(db):
    document = Document(
        id=str(uuid4()), organization_id=str(uuid4()), institution_id=str(uuid4()), owner_id=str(uuid4()),
        uploaded_by=str(uuid4()), filename="notes.txt", file_type="txt", file_size=4,
        file_path="/tmp/notes.txt", storage_path="test/notes.txt", visibility="institution",
    )
    db.add(document)
    db.commit()
    return document


def test_legal_transitions_and_illegal_skip(db):
    document = make_document(db)
    job = ingestion_service.enqueue(db, document)
    ingestion_service.transition(db, job, "EXTRACTING")
    ingestion_service.transition(db, job, "CHUNKING")
    ingestion_service.transition(db, job, "EMBEDDING")
    ingestion_service.transition(db, job, "COMPLETED")
    assert job.progress == 100
    with pytest.raises(ValueError, match="illegal"):
        ingestion_service.transition(db, job, "QUEUED")


def test_enqueue_is_idempotent_and_claim_has_lease(db):
    document = make_document(db)
    first = ingestion_service.enqueue(db, document)
    second = ingestion_service.enqueue(db, document)
    assert first.id == second.id
    claimed = ingestion_service.claim(db, "worker-a")
    assert claimed.id == first.id
    assert claimed.state == "EXTRACTING"
    assert claimed.attempt == 1
    assert claimed.lease_owner == "worker-a"


def test_stale_jobs_are_requeued_until_retry_limit(db):
    document = make_document(db)
    job = ingestion_service.enqueue(db, document)
    job.state = "EXTRACTING"
    job.attempt = 1
    job.lease_expires_at = datetime.utcnow() - timedelta(seconds=1)
    db.commit()
    assert ingestion_service.recover_stale(db) == 1
    assert db.get(IngestionJob, job.id).state == "QUEUED"

    job = db.get(IngestionJob, job.id)
    job.state = "EMBEDDING"
    job.attempt = job.max_attempts
    job.lease_expires_at = datetime.utcnow() - timedelta(seconds=1)
    db.commit()
    ingestion_service.recover_stale(db)
    assert db.get(IngestionJob, job.id).state == "FAILED"
