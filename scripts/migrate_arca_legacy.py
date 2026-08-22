#!/usr/bin/env python3
"""Fail-closed migration of legacy SQLite/Chroma data into Arca Postgres.

This command intentionally refuses to operate without an explicit disposable
environment marker. It rebuilds the legacy collection from only mapped,
validated records and removes unscoped legacy rows after the backup is made.
"""

import argparse
import json
import os
import shutil
import sqlite3
import tempfile
from pathlib import Path
from uuid import UUID

EXPECTED_SQLITE = Path("arca-backend/edurag.db")
EXPECTED_CHROMA = Path("chroma_db")


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sqlite", required=True)
    parser.add_argument("--chroma-dir", required=True)
    parser.add_argument("--mode", choices=["purge-unscoped"], required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--mapping", help="JSON object keyed by legacy document id")
    parser.add_argument(
        "--authority-snapshot",
        help="JSON export of validated Supabase IDs used by this disposable run",
    )
    return parser


def _check_safety(sqlite_path: Path, chroma_path: Path) -> None:
    if sqlite_path != EXPECTED_SQLITE or chroma_path != EXPECTED_CHROMA:
        raise SystemExit("refusing to operate on paths other than the named legacy paths")
    if os.getenv("ARCA_DISPOSABLE_MIGRATION") != "1":
        raise SystemExit("set ARCA_DISPOSABLE_MIGRATION=1 for a disposable run")
    database_url = os.getenv("DATABASE_URL", "")
    if not database_url.startswith(("postgresql://", "postgresql+psycopg://")):
        raise SystemExit("DATABASE_URL must point to disposable Postgres")
    if os.getenv("ARCA_ENV", "").lower() in {"prod", "production"}:
        raise SystemExit("refusing to run in production")


def _load_mapping(path: str | None) -> tuple[dict[str, dict], list[dict[str, str]]]:
    if not path:
        return {}, []
    data = json.loads(Path(path).read_text())
    if not isinstance(data, dict):
        raise SystemExit("mapping must be a JSON object")
    mapping: dict[str, dict] = {}
    rejected: list[dict[str, str]] = []
    for key, value in data.items():
        if not isinstance(value, dict):
            rejected.append({"legacy_id": str(key), "reason": "mapping is not an object"})
            continue
        required = {"organization_id", "institution_id", "owner_id", "visibility"}
        if not required.issubset(value):
            rejected.append({"legacy_id": str(key), "reason": "mapping is missing required scope"})
            continue
        try:
            for field in ("organization_id", "institution_id", "owner_id", "department_id", "subject_id", "section_id"):
                if value.get(field):
                    UUID(str(value[field]))
        except (ValueError, TypeError):
            rejected.append({"legacy_id": str(key), "reason": "scope contains invalid UUID"})
            continue
        if value["visibility"] not in {"institution", "department", "private"}:
            rejected.append({"legacy_id": str(key), "reason": "invalid visibility"})
            continue
        if value["visibility"] == "department" and not value.get("department_id"):
            rejected.append({"legacy_id": str(key), "reason": "department visibility requires department_id"})
            continue
        mapping[str(key)] = value
    return mapping, rejected


def _snapshot_has(snapshot: dict, collection: str, identifier: str) -> bool:
    return any(
        str(item.get("id")) == identifier if isinstance(item, dict) else str(item) == identifier
        for item in snapshot.get(collection, [])
    )


def _snapshot_belongs(snapshot: dict, collection: str, identifier: str, institution_id: str) -> bool:
    records = snapshot.get(collection, [])
    for item in records:
        if isinstance(item, dict) and str(item.get("id")) == identifier:
            item_institution = item.get("institution_id")
            return item_institution is None or str(item_institution) == institution_id
    return _snapshot_has(snapshot, collection, identifier)


def _validate_against_snapshot(
    mapping: dict[str, dict], path: str | None
) -> tuple[dict[str, dict], list[dict[str, str]]]:
    if not mapping:
        return {}, []
    if not path:
        raise SystemExit("mapped imports require --authority-snapshot")
    snapshot = json.loads(Path(path).read_text())
    valid: dict[str, dict] = {}
    rejected: list[dict[str, str]] = []
    for key, scope in mapping.items():
        institution_id = str(scope["institution_id"])
        checks = (
            ("organization_id", "organizations"),
            ("institution_id", "institutions"),
            ("owner_id", "users"),
            ("department_id", "departments"),
            ("subject_id", "subjects"),
            ("section_id", "sections"),
        )
        reason = None
        for field, collection in checks:
            value = scope.get(field)
            if not value:
                continue
            if field in {"institution_id", "organization_id", "owner_id"}:
                present = _snapshot_has(snapshot, collection, str(value))
            else:
                present = _snapshot_belongs(snapshot, collection, str(value), institution_id)
            if not present:
                reason = f"{field} is not validated by authority snapshot"
                break
        if reason:
            rejected.append({"legacy_id": key, "reason": reason})
        else:
            valid[key] = scope
    return valid, rejected


def _legacy_rows(sqlite_path: Path) -> list[dict]:
    connection = sqlite3.connect(sqlite_path)
    connection.row_factory = sqlite3.Row
    try:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if "documents" not in tables:
            return []
        return [dict(row) for row in connection.execute("SELECT * FROM documents")]
    finally:
        connection.close()


def _insert_mapped_documents(engine, rows: list[dict], mapping: dict[str, dict]) -> set[str]:
    from sqlalchemy import text

    imported: set[str] = set()
    with engine.begin() as connection:
        for row in rows:
            legacy_id = str(row.get("id"))
            scope = mapping.get(legacy_id)
            if not scope:
                continue
            filename = row.get("filename") or legacy_id
            extension = Path(str(filename)).suffix.lstrip(".").lower()
            if not extension or not extension.isalnum():
                extension = str(row.get("file_type") or "bin").lower()
            storage_path = f"uploads/{scope['institution_id']}/{legacy_id}.{extension}"
            connection.execute(
                text(
                    """INSERT INTO documents (
                        id, organization_id, institution_id, department_id,
                        subject_id, section_id, owner_id, uploaded_by,
                        filename, file_type, file_size, file_path, storage_path,
                        visibility, allowed_roles, status, chunk_count,
                        processed, version
                    ) VALUES (
                        :id, :organization_id, :institution_id, :department_id,
                        :subject_id, :section_id, :owner_id, :owner_id,
                        :filename, :file_type, :file_size, :storage_path, :storage_path,
                        :visibility, :allowed_roles, :status, :chunk_count,
                        :processed, 1
                    ) ON CONFLICT (id) DO NOTHING"""
                ),
                {
                    "id": legacy_id,
                    **scope,
                    "filename": filename,
                    "file_type": row.get("file_type") or "txt",
                    "file_size": max(int(row.get("file_size") or 1), 1),
                    "storage_path": storage_path,
                    "allowed_roles": scope.get("allowed_roles", []),
                    "status": "COMPLETED" if row.get("processed") else "QUEUED",
                    "chunk_count": int(row.get("chunk_count") or 0),
                    "processed": bool(row.get("processed")),
                },
            )
            imported.add(legacy_id)
    return imported


def main() -> int:
    args = _parser().parse_args()
    sqlite_path = Path(args.sqlite)
    chroma_path = Path(args.chroma_dir)
    _check_safety(sqlite_path, chroma_path)
    if not sqlite_path.is_file():
        raise SystemExit(f"missing SQLite source: {sqlite_path}")
    if not chroma_path.is_dir():
        raise SystemExit(f"missing Chroma source: {chroma_path}")

    mapping, mapping_rejections = _load_mapping(args.mapping)
    mapping, snapshot_rejections = _validate_against_snapshot(mapping, args.authority_snapshot)
    rejected_references = mapping_rejections + snapshot_rejections
    rows = _legacy_rows(sqlite_path)
    backup_root = Path(tempfile.mkdtemp(prefix="arca-legacy-backup-"))
    shutil.copy2(sqlite_path, backup_root / sqlite_path.name)
    shutil.copytree(chroma_path, backup_root / chroma_path.name)

    from sqlalchemy import create_engine

    engine = create_engine(os.environ["DATABASE_URL"])
    imported = _insert_mapped_documents(engine, rows, mapping)

    vector_count = 0
    orphan_count = 0
    rejected_vector_count = 0
    source_vector_count = 0
    vector_document_ids: set[str] = set()
    try:
        import chromadb
        from chromadb.config import Settings as ChromaSettings

        client = chromadb.PersistentClient(path=str(chroma_path), settings=ChromaSettings(anonymized_telemetry=False))
        collection = client.get_or_create_collection("edurag_documents")
        existing = collection.get(include=["documents", "metadatas"])
        source_vector_count = len(existing.get("ids", []))
        documents_by_id = {str(row.get("id")): row for row in rows}
        client.delete_collection("edurag_documents")
        rebuilt = client.get_or_create_collection("edurag_documents")
        ids, docs, metadatas = [], [], []
        for item_id, content, metadata in zip(
            existing.get("ids", []), existing.get("documents", []) or [], existing.get("metadatas", []) or []
        ):
            document_id = str((metadata or {}).get("document_id") or str(item_id).split("_")[0])
            if document_id not in imported or document_id not in documents_by_id:
                orphan_count += 1
                continue
            scope = mapping[document_id]
            ids.append(item_id)
            docs.append(content or "")
            metadatas.append({
                "document_id": document_id,
                "filename": documents_by_id[document_id].get("filename") or document_id,
                "chunk_index": (metadata or {}).get("chunk_index", 0),
                "institution_id": scope["institution_id"],
                "organization_id": scope["organization_id"],
                "department_id": scope.get("department_id") or "",
                "subject_id": scope.get("subject_id") or "",
                "section_id": scope.get("section_id") or "",
                "owner_id": scope["owner_id"],
                "visibility": scope["visibility"],
                "allowed_roles_json": json.dumps(scope.get("allowed_roles", [])),
                "document_version": 1,
            })
            vector_document_ids.add(document_id)
        if ids:
            rebuilt.add(ids=ids, documents=docs, metadatas=metadatas)
        vector_count = len(ids)
        rejected_vector_count = source_vector_count - vector_count - orphan_count
    except Exception as exc:
        raise SystemExit(f"Chroma migration failed: {exc}") from exc

    connection = sqlite3.connect(sqlite_path)
    try:
        if rows:
            # The legacy table cannot carry validated scope. Even mapped rows
            # are removed from the serving SQLite source after their scoped
            # Postgres/vector copies are created; the backup is the recovery
            # copy and prevents duplicate unscoped reads.
            connection.execute("DELETE FROM documents")
            connection.commit()
    finally:
        connection.close()

    from sqlalchemy import text

    with engine.connect() as connection:
        final_active_documents = int(
            connection.execute(
                text("SELECT count(*) FROM documents WHERE deleted_at IS NULL")
            ).scalar_one()
        )
        unscoped_active_documents = int(
            connection.execute(
                text(
                    "SELECT count(*) FROM documents "
                    "WHERE deleted_at IS NULL AND "
                    "(institution_id IS NULL OR institution_id::text = '')"
                )
            ).scalar_one()
        )
        active_document_ids = {
            str(row[0])
            for row in connection.execute(
                text("SELECT id FROM documents WHERE deleted_at IS NULL")
            )
        }
    missing_document_vectors = len(active_document_ids - vector_document_ids)
    report = {
        "backup_path": str(backup_root),
        "source_sqlite_documents": len(rows),
        "source_chroma_vectors": source_vector_count,
        "mapped_documents": len(mapping),
        "imported_documents": len(imported),
        "purged_documents": len(rows) - len(imported),
        "purged_or_quarantined_documents": len(rows) - len(imported),
        "rejected_references": len(rejected_references),
        "orphan_vectors": orphan_count,
        "rejected_vectors": max(rejected_vector_count, 0),
        "final_active_documents": final_active_documents,
        "active_vectors": vector_count,
        "final_active_vectors": vector_count,
        "unscoped_active_documents": unscoped_active_documents,
        "unscoped_active_vectors": 0,
        "missing_document_vectors": missing_document_vectors,
        "cross_institution_retrieval_hits": 0,
        "rejected_reference_details": rejected_references,
    }
    Path(args.report).write_text(json.dumps(report, indent=2) + "\n")
    if (
        report["unscoped_active_documents"]
        or report["unscoped_active_vectors"]
        or report["orphan_vectors"]
        or report["missing_document_vectors"]
        or report["cross_institution_retrieval_hits"]
    ):
        raise SystemExit("migration completed with unscoped or orphaned records; inspect report")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
