from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------- Documents ----------

class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    institution_id: str
    department_id: Optional[str] = None
    subject_id: Optional[str] = None
    section_id: Optional[str] = None
    owner_id: str
    visibility: str
    allowed_roles: List[str] = Field(default_factory=list)
    filename: str
    file_type: str
    file_size: int
    chunk_count: int
    processed: bool = False
    status: Optional[str] = None
    storage_path: Optional[str] = None
    processing_error: Optional[str] = None
    uploaded_at: Optional[str] = None
    processed_at: Optional[str] = None
    job_id: Optional[str] = None


class DocumentStats(BaseModel):
    total_documents: int
    total_chunks: int
    total_queries: int
    successful_retrievals: int


# ---------- Chat ----------

class UserContextPayload(BaseModel):
    """Legacy service-test type; never accepted by the HTTP ChatRequest."""

    user_id: Optional[str] = None
    name: Optional[str] = "User"
    email: Optional[str] = None
    role: Optional[str] = "Student"
    institution_id: Optional[str] = None

class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[str] = None
    top_k: Optional[int] = None
    database_context: Optional[str] = None
    client_turn_id: Optional[str] = None
    # Accepted only for legacy callers during the transition. Route handlers
    # never use it for identity or authorization and the Next.js gateway does
    # not send it.
    user_context: Optional[UserContextPayload] = None

    @field_validator("question")
    @classmethod
    def normalize_question(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("question must not be empty")
        return value


class PublicChatRequest(BaseModel):
    """Request contract for the unauthenticated product-help assistant."""

    model_config = ConfigDict(extra="forbid")

    question: str = Field(..., min_length=1, max_length=4000)

    @field_validator("question")
    @classmethod
    def normalize_question(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("question must not be empty")
        return value



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
    client_turn_id: Optional[str] = None
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
