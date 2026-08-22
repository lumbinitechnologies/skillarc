from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.db import get_db
from services import settings_service
from models.schemas import SettingsOut, UserInfo, RagConfig
from auth.dependencies import Principal, require_principal

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsOut)
def get_settings(principal: Principal = Depends(require_principal)):
    return SettingsOut(**settings_service.get_settings())


@router.put("/user", response_model=SettingsOut)
def update_user(user: UserInfo, principal: Principal = Depends(require_principal)):
    data = settings_service.get_settings()
    return SettingsOut(**data)


@router.put("/rag-config", response_model=SettingsOut)
def update_rag_config(config: RagConfig, principal: Principal = Depends(require_principal)):
    if principal.role not in {"INSTITUTION_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"}:
        raise HTTPException(status_code=403, detail="AUTH_FORBIDDEN")
    data = settings_service.update_rag_config(
        config.auto_process_documents,
        config.show_source_citations,
        config.top_k_retrieval,
        config.chunk_size,
    )
    return SettingsOut(**data)


@router.post("/clear-database")
def clear_database(
    db: Session = Depends(get_db), principal: Principal = Depends(require_principal)
):
    if principal.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="AUTH_FORBIDDEN")
    settings_service.clear_database(db)
    return {"success": True, "message": "Database and vector store cleared."}
