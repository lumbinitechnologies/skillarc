import json
from collections import defaultdict
from datetime import datetime
from typing import List

from sqlalchemy.orm import Session

from models.query_log import QueryLog


def get_analytics_stats(db: Session) -> dict:
    logs = db.query(QueryLog).all()
    total_queries = len(logs)
    successful = sum(1 for l in logs if l.successful)
    no_results = total_queries - successful
    avg_chunks = (
        sum(l.chunks_retrieved for l in logs) / total_queries if total_queries else 0.0
    )

    return {
        "total_queries": total_queries,
        "successful_retrievals": successful,
        "no_results": no_results,
        "avg_chunks_per_query": round(avg_chunks, 2),
    }


def get_query_volume(db: Session, days: int = 14) -> List[dict]:
    """Number of queries per day for the last N days."""
    logs = db.query(QueryLog).all()
    counts = defaultdict(int)

    for log in logs:
        if log.created_at:
            day = log.created_at.strftime("%Y-%m-%d")
            counts[day] += 1

    sorted_days = sorted(counts.keys())[-days:]
    return [{"date": d, "count": counts[d]} for d in sorted_days]


def get_document_usage(db: Session, limit: int = 10) -> List[dict]:
    """Most-referenced documents across all queries."""
    logs = db.query(QueryLog).all()
    counts = defaultdict(int)

    for log in logs:
        if log.referenced_documents:
            filenames = json.loads(log.referenced_documents)
            for fname in filenames:
                counts[fname] += 1

    sorted_items = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    return [{"filename": fname, "references": count} for fname, count in sorted_items]


def get_retrieval_success(db: Session) -> dict:
    """Breakdown for a pie/donut chart of successful vs no-result queries."""
    stats = get_analytics_stats(db)
    return {
        "successful": stats["successful_retrievals"],
        "no_results": stats["no_results"],
    }


def get_recent_queries(db: Session, limit: int = 20) -> List[QueryLog]:
    return (
        db.query(QueryLog)
        .order_by(QueryLog.created_at.desc())
        .limit(limit)
        .all()
    )
