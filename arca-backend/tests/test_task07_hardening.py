import io
import logging
from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.db import Base
from models.document import Document
from models.query_log import QueryLog, QueryLogDocumentReference
from services import analytics_service
from utils.logger import PrivacyFilter


def _db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_analytics_are_tenant_scoped_and_bounded():
    db = _db()
    now = datetime.utcnow()
    db.add_all([
        QueryLog(id="q1", institution_id="a", user_id="u", question="a", chunks_retrieved=2, successful=True, created_at=now),
        QueryLog(id="q2", institution_id="a", user_id="u", question="b", chunks_retrieved=0, successful=False, created_at=now - timedelta(days=2)),
        QueryLog(id="q3", institution_id="b", user_id="u", question="c", chunks_retrieved=9, successful=True, created_at=now),
        Document(id="d1", organization_id="o", institution_id="a", owner_id="u", uploaded_by="u", filename="a.pdf", file_type="pdf", file_size=1, file_path="/tmp/a", chunk_count=3),
        Document(id="d2", organization_id="o", institution_id="b", owner_id="u", uploaded_by="u", filename="b.pdf", file_type="pdf", file_size=1, file_path="/tmp/b", chunk_count=99),
    ])
    db.add_all([
        QueryLogDocumentReference(id="r1", query_log_id="q1", institution_id="a", filename="a.pdf", created_at=now),
        QueryLogDocumentReference(id="r2", query_log_id="q3", institution_id="b", filename="b.pdf", created_at=now),
    ])
    db.commit()

    assert analytics_service.get_analytics_stats(db, "a")["total_queries"] == 2
    assert analytics_service.get_document_stats(db, "a")["total_chunks"] == 3
    assert analytics_service.get_document_usage(db, institution_id="a") == [{"filename": "a.pdf", "references": 1}]
    assert len(analytics_service.get_recent_queries(db, limit=1, offset=0, institution_id="a")) == 1


def test_privacy_filter_redacts_sensitive_rendered_messages():
    record = logging.LogRecord("test", logging.ERROR, __file__, 1, "raw question=%s", (), None)
    # The filter is tested against a rendered message, as it is used by the handler.
    record.msg = "raw_question=private academic record"
    record.args = ()
    PrivacyFilter().filter(record)
    assert record.getMessage() == "sensitive operational detail redacted"
