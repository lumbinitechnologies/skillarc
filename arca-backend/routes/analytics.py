from fastapi import APIRouter, Depends, Query
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
from auth.dependencies import Principal, require_principal

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/stats", response_model=AnalyticsStats)
def get_stats(db: Session = Depends(get_db), principal: Principal = Depends(require_principal)):
    return AnalyticsStats(**analytics_service.get_analytics_stats(db, str(principal.institution_id) if principal.institution_id else None))


@router.get("/dashboard-stats", response_model=DocumentStats)
def get_dashboard_stats(db: Session = Depends(get_db), principal: Principal = Depends(require_principal)):
    tenant_id = str(principal.institution_id) if principal.institution_id else None
    doc_stats = analytics_service.get_document_stats(db, tenant_id)
    query_stats = analytics_service.get_analytics_stats(db, tenant_id)
    return DocumentStats(
        total_documents=doc_stats["total_documents"],
        total_chunks=doc_stats["total_chunks"],
        total_queries=query_stats["total_queries"],
        successful_retrievals=query_stats["successful_retrievals"],
    )


@router.get("/query-volume", response_model=list[QueryVolumePoint])
def get_query_volume(days: int = Query(14, ge=1, le=90), db: Session = Depends(get_db), principal: Principal = Depends(require_principal)):
    return [QueryVolumePoint(**p) for p in analytics_service.get_query_volume(db, days, str(principal.institution_id) if principal.institution_id else None)]


@router.get("/document-usage", response_model=list[DocumentUsagePoint])
def get_document_usage(limit: int = Query(10, ge=1, le=100), db: Session = Depends(get_db), principal: Principal = Depends(require_principal)):
    return [DocumentUsagePoint(**p) for p in analytics_service.get_document_usage(db, limit, str(principal.institution_id) if principal.institution_id else None)]


@router.get("/retrieval-success")
def get_retrieval_success(db: Session = Depends(get_db), principal: Principal = Depends(require_principal)):
    return analytics_service.get_retrieval_success(db, str(principal.institution_id) if principal.institution_id else None)


@router.get("/recent-queries", response_model=list[QueryLogOut])
def get_recent_queries(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), db: Session = Depends(get_db), principal: Principal = Depends(require_principal)):
    logs = analytics_service.get_recent_queries(db, limit, offset, str(principal.institution_id) if principal.institution_id else None)
    return [QueryLogOut(**l.to_dict()) for l in logs]
