from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.db import settings
from database.init_db import init_db
from routes import documents, chat, analytics, settings as settings_routes
from utils.logger import get_logger
from rag.embeddings import get_embedding_function

logger = get_logger(__name__)

app = FastAPI(
    title="EduRAG API",
    description="AI Knowledge Assistant - Retrieval-Augmented Generation backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()
    logger.info("Pre-loading embedding model...")
    get_embedding_function()
    logger.info("Embedding model loaded successfully.")
    logger.info("EduRAG backend started.")
    logger.info(f"Upload directory: {settings.UPLOAD_DIR}")
    logger.info(f"Chroma directory: {settings.CHROMA_DIR}")
    if not settings.GROQ_API_KEY:
        logger.warning(
            "GROQ_API_KEY is not set. Chat requests will fail until it is configured in backend/.env"
        )


@app.get("/")
def root():
    return {"status": "ok", "service": "EduRAG API", "version": "1.0.0"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(analytics.router)
app.include_router(settings_routes.router)
