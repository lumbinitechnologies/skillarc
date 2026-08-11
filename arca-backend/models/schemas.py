from typing import List, Optional
from pydantic import BaseModel, Field


# ---------- Documents ----------

class DocumentOut(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    chunk_count: int
    processed: bool
    processing_error: Optional[str] = None
    uploaded_at: Optional[str] = None
    processed_at: Optional[str] = None


class DocumentStats(BaseModel):
    total_documents: int
    total_chunks: int
    total_queries: int
    successful_retrievals: int


# ---------- Chat ----------

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)
    session_id: Optional[str] = None
    top_k: Optional[int] = None


class SourceCitation(BaseModel):
    document_id: str
    filename: str
    chunk_index: int
    snippet: str
    score: Optional[float] = None


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    sources: List[SourceCitation]
    chunks_retrieved: int


class ChatMessageOut(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    sources: List[SourceCitation]
    created_at: Optional[str] = None


class ChatSessionOut(BaseModel):
    id: str
    title: str
    created_at: Optional[str] = None


# ---------- Analytics ----------

class AnalyticsStats(BaseModel):
    total_queries: int
    successful_retrievals: int
    no_results: int
    avg_chunks_per_query: float


class QueryVolumePoint(BaseModel):
    date: str
    count: int


class DocumentUsagePoint(BaseModel):
    filename: str
    references: int


class QueryLogOut(BaseModel):
    id: str
    question: str
    chunks_retrieved: int
    successful: bool
    referenced_documents: List[str]
    created_at: Optional[str] = None


# ---------- Settings ----------

class UserInfo(BaseModel):
    name: str
    email: str
    role: str


class RagConfig(BaseModel):
    auto_process_documents: bool = True
    show_source_citations: bool = True
    top_k_retrieval: int = 4
    chunk_size: int = 1000


class SettingsOut(BaseModel):
    user: UserInfo
    rag_config: RagConfig
