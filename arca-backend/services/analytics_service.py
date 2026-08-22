from datetime import datetime, timedelta
from typing import List

from sqlalchemy import case, desc, func
from sqlalchemy.orm import Session

from models.document import Document
from models.query_log import QueryLog, QueryLogDocumentReference

MAX_ANALYTICS_DAYS = 90
MAX_PAGE_SIZE = 100


def _days(value: int) -> int:
    return max(1, min(int(value), MAX_ANALYTICS_DAYS))


def _limit(value: int) -> int:
    return max(1, min(int(value), MAX_PAGE_SIZE))


def get_analytics_stats(db: Session, institution_id: str | None = None) -> dict:
    query = db.query(
        func.count(QueryLog.id).label("total_queries"),
        func.coalesce(func.sum(case((QueryLog.successful.is_(True), 1), else_=0)), 0).label("successful"),
        func.coalesce(func.avg(QueryLog.chunks_retrieved), 0.0).label("avg_chunks"),
    )
    if institution_id:
        query = query.filter(QueryLog.institution_id == institution_id)
    row = query.one()
    total = int(row.total_queries or 0)
    successful = int(row.successful or 0)
    return {"total_queries": total, "successful_retrievals": successful, "no_results": total - successful, "avg_chunks_per_query": round(float(row.avg_chunks or 0), 2)}


def get_query_volume(db: Session, days: int = 14, institution_id: str | None = None) -> List[dict]:
    since = datetime.utcnow() - timedelta(days=_days(days))
    query = db.query(func.date(QueryLog.created_at).label("date"), func.count(QueryLog.id).label("count")).filter(QueryLog.created_at >= since)
    if institution_id:
        query = query.filter(QueryLog.institution_id == institution_id)
    rows = query.group_by(func.date(QueryLog.created_at)).order_by(func.date(QueryLog.created_at)).all()
    return [{"date": str(row.date), "count": int(row.count)} for row in rows]


def get_document_usage(db: Session, limit: int = 10, institution_id: str | None = None) -> List[dict]:
    query = db.query(QueryLogDocumentReference.filename, func.count(QueryLogDocumentReference.id).label("references"))
    if institution_id:
        query = query.filter(QueryLogDocumentReference.institution_id == institution_id)
    rows = query.group_by(QueryLogDocumentReference.filename).order_by(desc("references")).limit(_limit(limit)).all()
    return [{"filename": row.filename, "references": int(row.references)} for row in rows]


def get_retrieval_success(db: Session, institution_id: str | None = None) -> dict:
    stats = get_analytics_stats(db, institution_id)
    return {"successful": stats["successful_retrievals"], "no_results": stats["no_results"]}


def get_recent_queries(db: Session, limit: int = 20, offset: int = 0, institution_id: str | None = None) -> List[QueryLog]:
    query = db.query(QueryLog)
    if institution_id:
        query = query.filter(QueryLog.institution_id == institution_id)
    return query.order_by(QueryLog.created_at.desc()).offset(max(0, int(offset))).limit(_limit(limit)).all()


def get_document_stats(db: Session, institution_id: str | None = None) -> dict:
    query = db.query(func.count(Document.id), func.coalesce(func.sum(Document.chunk_count), 0)).filter(Document.deleted_at.is_(None))
    if institution_id:
        query = query.filter(Document.institution_id == institution_id)
    total, chunks = query.one()
    return {"total_documents": int(total or 0), "total_chunks": int(chunks or 0)}
