import os
import json
import pytest
from unittest.mock import patch, MagicMock
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.db import Base
from models.schemas import ChatRequest, PublicChatRequest, UserContextPayload, ChatResponse
from models.chat import ChatSession, ChatMessage
from models.query_log import QueryLog
from rag.llm_client import build_prompt, build_public_prompt
import services.chat_service as chat_service
from services.settings_service import SETTINGS_FILE, get_settings
from main import app
from auth.dependencies import Principal
from routes import chat as chat_routes
from services.tenant_authorization import RelationshipScope


from sqlalchemy.pool import StaticPool

@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionTesting = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionTesting()
    try:
        yield db
    finally:
        db.close()



class TestChatRequestSchema:
    def test_schema_with_structured_fields(self):
        payload = {
            "question": "What is the schedule for tomorrow?",
            "session_id": "test-session-123",
            "top_k": 4,
            "database_context": "User Profile Summary:\n- Name: Alice",
            "user_context": {
                "name": "Alice Smith",
                "email": "alice@skillarc.edu",
                "role": "Faculty",
                "institution_id": "inst-1",
            },
        }
        req = ChatRequest(**payload)
        assert req.question == "What is the schedule for tomorrow?"
        assert req.session_id == "test-session-123"
        assert req.top_k == 4
        assert req.database_context == "User Profile Summary:\n- Name: Alice"
        assert req.user_context.name == "Alice Smith"
        assert req.user_context.role == "Faculty"

    def test_schema_with_minimal_fields(self):
        req = ChatRequest(question="Hello world")
        assert req.question == "Hello world"
        assert req.session_id is None
        assert req.database_context is None
        assert req.user_context is None


class TestChatMessagePersistence:
    def test_user_messages_store_empty_sources_array(self, test_db):
        message = chat_service._save_message(
            test_db,
            session_id="session-1",
            role="user",
            content="list sections assigned to my schedule",
        )

        assert message.sources == "[]"


class TestPublicChatBoundary:
    def test_public_request_rejects_extra_identity_fields(self):
        with pytest.raises(ValidationError):
            PublicChatRequest(question="hello", institution_id="private")

    def test_public_prompt_has_no_authenticated_database_context_contract(self):
        prompt = build_public_prompt("What is SkillArc?", "[What SkillArc is]\nA platform")
        assert "DATABASE_CONTEXT" not in prompt
        assert "personal or campus-specific" in prompt



class TestVectorSearchIsolation:
    @patch("services.chat_service.similarity_search")
    @patch("services.chat_service.generate_answer")
    def test_similarity_search_receives_only_pure_question(
        self, mock_generate, mock_search, test_db
    ):
        mock_search.return_value = [
            {"document_id": "doc1", "filename": "handbook.pdf", "chunk_index": 0, "text": "chunk text", "score": 0.9}
        ]
        mock_generate.return_value = "Test response"

        user_ctx = UserContextPayload(name="Nikhil", role="Student")
        db_context = "Academic Details:\n- Program: CSE\nAttendance Summary:\n- OS: 85%"

        pure_question = "When is my OS assignment due?"
        chat_service.ask_question(
            db=test_db,
            question=pure_question,
            database_context=db_context,
            user_context=user_ctx,
        )

        # Invariant 1: similarity_search is called with ONLY pure_question
        mock_search.assert_called_once_with(pure_question, top_k=4)
        assert mock_search.call_args[0][0] == pure_question
        assert "[DATABASE_CONTEXT" not in mock_search.call_args[0][0]
        assert "Attendance Summary" not in mock_search.call_args[0][0]

    @patch("services.chat_service.similarity_search")
    @patch("services.chat_service.generate_answer")
    def test_changing_database_context_produces_identical_search_query(
        self, mock_generate, mock_search, test_db
    ):
        mock_search.return_value = []
        mock_generate.return_value = "Test response"

        question = "What are the lab timings?"

        # Call 1 with student context
        chat_service.ask_question(
            db=test_db,
            question=question,
            database_context="Student Profile: Grade A",
            user_context=UserContextPayload(name="Student A", role="Student"),
        )
        first_call_query = mock_search.call_args_list[-1][0][0]

        # Call 2 with completely different faculty context
        chat_service.ask_question(
            db=test_db,
            question=question,
            database_context="Faculty Profile: Teaching 5 courses",
            user_context=UserContextPayload(name="Prof B", role="Faculty"),
        )
        second_call_query = mock_search.call_args_list[-1][0][0]

        assert first_call_query == second_call_query == question


class TestPromptAssembly:
    def test_prompt_assembly_with_db_context_and_user_context(self):
        chunks = [
            {"filename": "syllabus.pdf", "text": "CS101 covers algorithms and data structures."}
        ]
        db_context = "User Profile Summary:\n- Name: Nikhil Sharma\n- Role: Student"
        prompt = build_prompt(
            question="What does CS101 cover?",
            chunks=chunks,
            database_context=db_context,
            user_name="Nikhil Sharma",
            user_role="Student",
        )

        # Invariant: Prompt contains request-scoped identity
        assert 'The active user is "Nikhil Sharma"' in prompt
        assert 'whose role in the system is "Student"' in prompt

        # Invariant: Database context is isolated in its own section
        assert "-----------------------" in prompt
        assert "DATABASE CONTEXT" in prompt
        assert db_context in prompt

        # Invariant: Document context is formatted
        assert "DOCUMENT CONTEXT" in prompt
        assert "[Source 1 - syllabus.pdf]" in prompt
        assert "CS101 covers algorithms and data structures." in prompt

        # Invariant: Clean question
        assert "-----------------------" in prompt
        assert "QUESTION" in prompt
        assert "What does CS101 cover?" in prompt

    def test_prompt_assembly_without_db_context(self):
        chunks = []
        prompt = build_prompt(
            question="Hello",
            chunks=chunks,
            database_context=None,
            user_name="Dr. Smith",
            user_role="Faculty",
        )

        assert 'The active user is "Dr. Smith"' in prompt
        assert 'whose role in the system is "Faculty"' in prompt
        assert "DATABASE CONTEXT" not in prompt
        assert "No relevant context was found in the uploaded documents." in prompt


class TestSessionTitlingAndQueryLogging:
    @patch("services.chat_service.similarity_search")
    @patch("services.chat_service.generate_answer")
    def test_session_title_and_query_log_never_contain_db_context(
        self, mock_generate, mock_search, test_db
    ):
        mock_search.return_value = []
        mock_generate.return_value = "Answer"

        question = "What are the rules for exam eligibility?"
        db_context = "User Profile Summary:\n- Name: Nikhil\nAttendance Summary: 65%"

        res = chat_service.ask_question(
            db=test_db,
            question=question,
            database_context=db_context,
            user_context=UserContextPayload(name="Nikhil", role="Student"),
        )

        # Invariant 2: Session title is derived purely from question
        session = test_db.query(ChatSession).filter(ChatSession.id == res["session_id"]).first()
        assert session is not None
        assert session.title == question
        assert "[DATABASE_CONTEXT" not in session.title
        assert "Attendance Summary" not in session.title

        # Invariant 3: Query log question is purely user question
        log = test_db.query(QueryLog).first()
        assert log is not None
        assert log.question == question
        assert "[DATABASE_CONTEXT" not in log.question

        # Invariant: User message content in chat_messages is pure question
        user_msg = test_db.query(ChatMessage).filter(ChatMessage.role == "user").first()
        assert user_msg is not None
        assert user_msg.content == question


class TestSettingsIsolationAndConcurrency:
    @patch("services.chat_service.similarity_search")
    @patch("services.chat_service.generate_answer")
    def test_app_settings_json_not_modified_during_chat(
        self, mock_generate, mock_search, test_db
    ):
        mock_search.return_value = []
        mock_generate.return_value = "Answer"

        initial_mtime = os.path.getmtime(SETTINGS_FILE) if SETTINGS_FILE.exists() else None
        initial_content = SETTINGS_FILE.read_text() if SETTINGS_FILE.exists() else None

        # Simulate multiple concurrent queries with different identities
        users = [
            UserContextPayload(name="User1", role="Student"),
            UserContextPayload(name="User2", role="Faculty"),
            UserContextPayload(name="User3", role="Institution Admin"),
        ]

        for u in users:
            chat_service.ask_question(
                db=test_db,
                question=f"Question from {u.name}",
                database_context=f"Context for {u.name}",
                user_context=u,
            )

        if SETTINGS_FILE.exists():
            final_mtime = os.path.getmtime(SETTINGS_FILE)
            final_content = SETTINGS_FILE.read_text()
            assert final_mtime == initial_mtime
            assert final_content == initial_content


class TestFastAPIRoutes:
    @patch("services.chat_service.similarity_search")
    @patch("services.chat_service.generate_answer")
    def test_api_chat_ask_endpoint(self, mock_generate, mock_search, test_db):
        principal = Principal(
            user_id="11111111-1111-4111-8111-111111111111",
            actor_user_id="11111111-1111-4111-8111-111111111111",
            organization_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            institution_id="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            department_id=None,
            role="STUDENT",
            name="Test Student",
            email="test@example.com",
            is_impersonating=False,
            issued_at=1,
            expires_at=61,
        )
        scope = RelationshipScope(
            user_id=str(principal.user_id),
            institution_id=str(principal.institution_id),
            organization_id=str(principal.organization_id),
            role=principal.role,
        )
        mock_search.return_value = []
        mock_generate.return_value = "FastAPI answer"

        with patch.object(chat_service, "resolve_relationship_scope", return_value=scope), patch.object(
            chat_service, "_authorized_search", return_value=[]
        ):
            response = chat_routes.ask(
                ChatRequest(
                    question="Where is the library?",
                    top_k=3,
                    database_context="User Profile Summary:\n- Name: Test",
                ),
                test_db,
                principal,
            )

        assert response.answer == "FastAPI answer"
        assert response.session_id
        assert response.chunks_retrieved == 0

    @patch("services.chat_service.similarity_search")
    @patch("services.chat_service.generate_answer_stream")
    def test_api_chat_ask_stream_endpoint(self, mock_stream, mock_search, test_db):
        principal = Principal(
            user_id="11111111-1111-4111-8111-111111111111",
            actor_user_id="11111111-1111-4111-8111-111111111111",
            organization_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            institution_id="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            department_id=None,
            role="STUDENT",
            name="Test Student",
            email="test@example.com",
            is_impersonating=False,
            issued_at=1,
            expires_at=61,
        )
        scope = RelationshipScope(
            user_id=str(principal.user_id),
            institution_id=str(principal.institution_id),
            organization_id=str(principal.organization_id),
            role=principal.role,
        )
        mock_search.return_value = []
        mock_stream.return_value = iter(["Hello", " world!"])

        with patch.object(chat_service, "resolve_relationship_scope", return_value=scope), patch.object(
            chat_service, "_authorized_search", return_value=[]
        ):
            response = chat_routes.ask_stream(
                ChatRequest(
                    question="Tell me a joke",
                    database_context="User Profile Summary:\n- Name: Test",
                ),
                test_db,
                principal,
            )
            body = "".join(chat_service.ask_question_stream(
                db=test_db,
                question="Tell me a joke",
                database_context="User Profile Summary:\n- Name: Test",
                principal=principal,
            ))

        assert response.media_type == "text/event-stream"
        assert "event: session" in body
        assert "event: token" in body
        assert "event: sources" in body
        assert "event: done" in body
