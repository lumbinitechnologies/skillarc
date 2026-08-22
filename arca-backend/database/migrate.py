"""Idempotent Postgres migration runner for the operational Arca database."""

from pathlib import Path

from sqlalchemy import create_engine, text

from database.db import settings


MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def migrate(database_url: str | None = None) -> list[str]:
    url = database_url or settings.DATABASE_URL
    if url.startswith("sqlite"):
        raise RuntimeError("operational migrations require Postgres")
    engine = create_engine(url)
    applied: list[str] = []
    with engine.begin() as connection:
        connection.exec_driver_sql("SELECT pg_advisory_xact_lock(hashtext('arca:migrations'))")
        connection.exec_driver_sql(
            "CREATE TABLE IF NOT EXISTS schema_migrations "
            "(version text PRIMARY KEY, applied_at timestamptz NOT NULL)"
        )
        existing = {
            row[0]
            for row in connection.execute(text("SELECT version FROM schema_migrations"))
        }
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if path.stem in existing:
                continue
            # Compile the migration as SQLAlchemy text so literal percent
            # signs in PostgreSQL regex expressions are not interpreted as
            # psycopg parameter placeholders.
            connection.execute(text(path.read_text()))
            connection.execute(
                text("INSERT INTO schema_migrations(version, applied_at) VALUES (:version, now())"),
                {"version": path.stem},
            )
            applied.append(path.stem)
    return applied


if __name__ == "__main__":
    print("applied:", ", ".join(migrate()) or "none")
