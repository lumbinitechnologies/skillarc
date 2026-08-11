from database.db import Base, engine

# Import all models so they register with Base's metadata before create_all
from models.document import Document  # noqa: F401
from models.chat import ChatSession, ChatMessage  # noqa: F401
from models.query_log import QueryLog  # noqa: F401


def init_db():
    Base.metadata.create_all(bind=engine)
