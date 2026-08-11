from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.db import get_db
from services import analytics_service, document_service
from models.schemas import (
    AnalyticsStats,
    QueryVolumePoint,
    DocumentUsagePoint,
    QueryLogOut,
    DocumentStats,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/stats", response_model=AnalyticsStats)
def get_stats(db: Session = Depends(get_db)):
    return AnalyticsStats(**analytics_service.get_analytics_stats(db))


@router.get("/dashboard-stats", response_model=DocumentStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    doc_stats = document_service.get_document_stats(db)
    query_stats = analytics_service.get_analytics_stats(db)
    return DocumentStats(
        total_documents=doc_stats["total_documents"],
        total_chunks=doc_stats["total_chunks"],
        total_queries=query_stats["total_queries"],
        successful_retrievals=query_stats["successful_retrievals"],
    )


@router.get("/query-volume", response_model=list[QueryVolumePoint])
def get_query_volume(db: Session = Depends(get_db)):
    return [QueryVolumePoint(**p) for p in analytics_service.get_query_volume(db)]


@router.get("/document-usage", response_model=list[DocumentUsagePoint])
def get_document_usage(db: Session = Depends(get_db)):
    return [DocumentUsagePoint(**p) for p in analytics_service.get_document_usage(db)]


@router.get("/retrieval-success")
def get_retrieval_success(db: Session = Depends(get_db)):
    return analytics_service.get_retrieval_success(db)


@router.get("/recent-queries", response_model=list[QueryLogOut])
def get_recent_queries(db: Session = Depends(get_db)):
    logs = analytics_service.get_recent_queries(db)
    return [QueryLogOut(**l.to_dict()) for l in logs]
