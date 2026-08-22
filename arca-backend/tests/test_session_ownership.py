from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth.dependencies import Principal
from database.db import Base
from models.chat import ChatMessage, ChatSession
from services.chat_service import SessionAccessError, get_or_create_session, get_session_messages, list_sessions


def principal(user_id, institution_id):
    return Principal(
        user_id=user_id,
        actor_user_id=user_id,
        organization_id=uuid4(),
        institution_id=institution_id,
        department_id=None,
        role="STUDENT",
        name="Student",
        email="student@example.edu",
        is_impersonating=False,
        issued_at=1,
        expires_at=61,
    )


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def test_cross_user_session_cannot_be_reused_or_mutated(db):
    institution = uuid4()
    owner = principal(uuid4(), institution)
    attacker = principal(uuid4(), institution)
    session = get_or_create_session(db, None, owner)

    with pytest.raises(SessionAccessError):
        get_or_create_session(db, session.id, attacker)

    assert list_sessions(db, attacker) == []


def test_cross_institution_session_and_messages_are_hidden(db):
    owner = principal(uuid4(), uuid4())
    attacker = principal(uuid4(), uuid4())
    session = get_or_create_session(db, None, owner)
    db.add(ChatMessage(session_id=session.id, role="user", content="private"))
    db.commit()

    assert list_sessions(db, attacker) == []
    with pytest.raises(SessionAccessError):
        get_session_messages(db, session.id, attacker)


def test_owner_can_list_and_read_owned_session(db):
    owner = principal(uuid4(), uuid4())
    session = get_or_create_session(db, None, owner)
    db.add(ChatMessage(session_id=session.id, role="user", content="owned"))
    db.commit()

    assert [item.id for item in list_sessions(db, owner)] == [session.id]
    messages = get_session_messages(db, session.id, owner)
    assert [item.content for item in messages] == ["owned"]
