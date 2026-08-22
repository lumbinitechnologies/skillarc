from database.db import Base, engine

# Import all models so they register with Base's metadata before create_all
from models.document import Document, DocumentShare, IngestionJob  # noqa: F401
from models.chat import ChatSession, ChatMessage  # noqa: F401
from models.query_log import QueryLog, QueryLogDocumentReference  # noqa: F401


def init_db():
    # SQLite is retained only for isolated unit tests. Deployed Postgres
    # schemas are created by database.migrate under an advisory lock.
    if engine.url.drivername.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
