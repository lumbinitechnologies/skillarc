import json
from pathlib import Path

from sqlalchemy.orm import Session

from database.db import settings as app_settings
from models.document import Document
from models.chat import ChatSession, ChatMessage
from models.query_log import QueryLog
from rag.vector_store import clear_all
from utils.file_utils import delete_file
from utils.logger import get_logger

logger = get_logger(__name__)

SETTINGS_FILE = Path(__file__).resolve().parent.parent / "app_settings.json"

DEFAULT_SETTINGS = {
    "user": {
        "name": "Guest User",
        "email": "guest@edurag.local",
        "role": "Student",
    },
    "rag_config": {
        "auto_process_documents": True,
        "show_source_citations": True,
        "top_k_retrieval": app_settings.DEFAULT_TOP_K,
        "chunk_size": app_settings.DEFAULT_CHUNK_SIZE,
    },
}


def _read_settings() -> dict:
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            logger.warning("Failed to read app_settings.json, using defaults.")
    return DEFAULT_SETTINGS.copy()


def _write_settings(data: dict) -> None:
    with open(SETTINGS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def get_settings() -> dict:
    return _read_settings()


def update_user_info(name: str, email: str, role: str) -> dict:
    data = _read_settings()
    data["user"] = {"name": name, "email": email, "role": role}
    _write_settings(data)
    return data


def update_rag_config(
    auto_process_documents: bool,
    show_source_citations: bool,
    top_k_retrieval: int,
    chunk_size: int,
) -> dict:
    data = _read_settings()
    data["rag_config"] = {
        "auto_process_documents": auto_process_documents,
        "show_source_citations": show_source_citations,
        "top_k_retrieval": top_k_retrieval,
        "chunk_size": chunk_size,
    }
    _write_settings(data)
    return data


def clear_database(db: Session) -> None:
    """Danger zone: wipe all documents, chunks, chats, and query logs."""
    documents = db.query(Document).all()
    for doc in documents:
        delete_file(doc.file_path)

    db.query(ChatMessage).delete()
    db.query(ChatSession).delete()
    db.query(QueryLog).delete()
    db.query(Document).delete()
    db.commit()

    clear_all()
    logger.info("Database and vector store cleared.")
