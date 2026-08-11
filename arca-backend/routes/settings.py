from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.db import get_db
from services import settings_service
from models.schemas import SettingsOut, UserInfo, RagConfig

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsOut)
def get_settings():
    return SettingsOut(**settings_service.get_settings())


@router.put("/user", response_model=SettingsOut)
def update_user(user: UserInfo):
    data = settings_service.update_user_info(user.name, user.email, user.role)
    return SettingsOut(**data)


@router.put("/rag-config", response_model=SettingsOut)
def update_rag_config(config: RagConfig):
    data = settings_service.update_rag_config(
        config.auto_process_documents,
        config.show_source_citations,
        config.top_k_retrieval,
        config.chunk_size,
    )
    return SettingsOut(**data)


@router.post("/clear-database")
def clear_database(db: Session = Depends(get_db)):
    settings_service.clear_database(db)
    return {"success": True, "message": "Database and vector store cleared."}
