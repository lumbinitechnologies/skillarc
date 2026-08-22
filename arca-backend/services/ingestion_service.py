"""Durable ingestion queue protocol shared by the API and worker."""

from datetime import datetime, timedelta
import uuid

from sqlalchemy import or_
from sqlalchemy.orm import Session

from models.document import Document, IngestionJob

ACTIVE_STATES = {"QUEUED", "EXTRACTING", "CHUNKING", "EMBEDDING"}
TERMINAL_STATES = {"COMPLETED", "FAILED", "CANCELLED"}
TRANSITIONS = {
    "QUEUED": ACTIVE_STATES | {"FAILED", "CANCELLED"},
    "EXTRACTING": {"CHUNKING", "FAILED", "CANCELLED"},
    "CHUNKING": {"EMBEDDING", "FAILED", "CANCELLED"},
    "EMBEDDING": {"COMPLETED", "FAILED", "CANCELLED"},
}
LEASE_SECONDS = 90


def _now() -> datetime:
    return datetime.utcnow()


def enqueue(db: Session, document: Document) -> IngestionJob:
    key = f"{document.id}:v{document.version}"
    job = db.query(IngestionJob).filter(IngestionJob.idempotency_key == key).first()
    if job:
        return job
    job = IngestionJob(document_id=document.id, idempotency_key=key)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def active_job(db: Session, document_id: str) -> IngestionJob | None:
    return (
        db.query(IngestionJob)
        .filter(IngestionJob.document_id == document_id, IngestionJob.state.in_(ACTIVE_STATES))
        .order_by(IngestionJob.created_at.desc())
        .first()
    )


def latest_job(db: Session, document_id: str) -> IngestionJob | None:
    return db.query(IngestionJob).filter(IngestionJob.document_id == document_id).order_by(IngestionJob.created_at.desc()).first()


def transition(
    db: Session,
    job: IngestionJob,
    state: str,
    *,
    error: str | None = None,
    lease_owner: str | None = None,
) -> IngestionJob:
    if lease_owner is not None and job.lease_owner != lease_owner:
        raise ValueError("ingestion lease is no longer owned by this worker")
    if state not in TRANSITIONS.get(job.state, set()):
        raise ValueError(f"illegal ingestion transition: {job.state} -> {state}")
    job.state = state
    job.last_error = error
    job.progress = {"EXTRACTING": 10, "CHUNKING": 35, "EMBEDDING": 65, "COMPLETED": 100}.get(state, job.progress)
    job.updated_at = _now()
    if state == "COMPLETED" or state == "CANCELLED":
        job.finished_at = _now()
        job.lease_owner = None
        job.lease_expires_at = None
    db.flush()
    return job


def claim(db: Session, lease_owner: str | None = None) -> IngestionJob | None:
    """Claim one available job atomically; SKIP LOCKED is used on Postgres."""
    now = _now()
    lease_owner = lease_owner or str(uuid.uuid4())
    candidate = (
        db.query(IngestionJob)
        .filter(
            or_(
                (IngestionJob.state == "QUEUED") & (IngestionJob.available_at <= now),
                (IngestionJob.state.in_({"EXTRACTING", "CHUNKING", "EMBEDDING"}))
                & (IngestionJob.lease_expires_at < now),
            ),
            IngestionJob.attempt < IngestionJob.max_attempts,
        )
        .order_by(IngestionJob.created_at.asc())
        .with_for_update(skip_locked=True)
        .first()
    )
    if not candidate:
        recover_stale(db)
        return None
    candidate.state = "EXTRACTING"
    candidate.attempt += 1
    candidate.lease_owner = lease_owner
    candidate.lease_expires_at = now + timedelta(seconds=LEASE_SECONDS)
    candidate.heartbeat_at = now
    candidate.started_at = candidate.started_at or now
    candidate.updated_at = now
    db.commit()
    db.refresh(candidate)
    return candidate


def heartbeat(db: Session, job_id: str, lease_owner: str) -> bool:
    job = db.query(IngestionJob).filter(IngestionJob.id == job_id, IngestionJob.lease_owner == lease_owner).first()
    if not job or job.state not in ACTIVE_STATES:
        return False
    now = _now()
    job.heartbeat_at = now
    job.lease_expires_at = now + timedelta(seconds=LEASE_SECONDS)
    job.updated_at = now
    db.commit()
    return True


def recover_stale(db: Session) -> int:
    now = _now()
    stale = db.query(IngestionJob).filter(IngestionJob.state.in_({"EXTRACTING", "CHUNKING", "EMBEDDING"}), IngestionJob.lease_expires_at < now).all()
    changed = 0
    for job in stale:
        if job.attempt >= job.max_attempts:
            transition(db, job, "FAILED", error="retry limit exceeded")
        else:
            job.state = "QUEUED"
            job.available_at = now
            job.lease_owner = None
            job.lease_expires_at = None
            job.updated_at = now
        changed += 1
    db.commit()
    return changed


def fail_or_retry(db: Session, job: IngestionJob, error: str, retryable: bool = True) -> IngestionJob:
    if retryable and job.attempt < job.max_attempts:
        job.state = "QUEUED"
        job.available_at = _now() + timedelta(seconds=min(300, (2 ** job.attempt) * 5))
        job.last_error = error
        job.lease_owner = None
        job.lease_expires_at = None
        job.updated_at = _now()
        db.commit()
        return job
    transition(db, job, "FAILED", error=error)
    db.commit()
    return job


def cancel_document_jobs(db: Session, document_id: str) -> int:
    jobs = db.query(IngestionJob).filter(IngestionJob.document_id == document_id, IngestionJob.state.in_(ACTIVE_STATES)).all()
    for job in jobs:
        transition(db, job, "CANCELLED")
    db.commit()
    return len(jobs)
