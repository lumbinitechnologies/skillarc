import os
import uuid
from pathlib import Path

from fastapi import UploadFile

from database.db import settings

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


class InvalidFileError(Exception):
    pass


def validate_file(file: UploadFile) -> str:
    """Validate file extension and return the lowercase extension (no dot)."""
    ext = Path(file.filename).suffix.lower().lstrip(".")
    if ext not in ALLOWED_EXTENSIONS:
        raise InvalidFileError(
            f"Unsupported file type '.{ext}'. Allowed types: PDF, DOCX, TXT."
        )
    return ext


async def save_upload_file(
    file: UploadFile,
    ext: str,
    institution_id: str,
    document_id: str,
    organization_id: str | None = None,
) -> tuple[str, int]:
    """Persist an upload in an immutable organization/institution partition.

    The returned path is an absolute server-local path for extraction. The
    document's public ``storage_path`` must use ``storage_key`` below instead;
    absolute paths must never be persisted as tenant metadata or returned to a
    client.
    """
    organization_id = organization_id or "unscoped"
    storage_key = storage_path(organization_id, institution_id, document_id, ext)
    destination = settings.UPLOAD_DIR / Path(storage_key)
    destination.parent.mkdir(parents=True, exist_ok=True)

    size = 0
    with open(destination, "wb") as out_file:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_FILE_SIZE_BYTES:
                out_file.close()
                os.remove(destination)
                raise InvalidFileError("File exceeds the 25MB size limit.")
            out_file.write(chunk)

    await file.seek(0)
    return str(destination), size


def storage_path(
    organization_id: str, institution_id: str, document_id: str, ext: str
) -> str:
    """Return the canonical, tenant-partitioned relative storage key."""
    # All path components are server-generated UUIDs (or the fixed fallback),
    # never client supplied filenames. Keep this check defensive for callers.
    components = (organization_id, institution_id, document_id)
    if any(
        not component or component in {".", ".."} or Path(component).name != component
        for component in components
    ):
        raise InvalidFileError("Invalid tenant storage scope")
    safe_ext = ext.lower().lstrip(".")
    if safe_ext not in ALLOWED_EXTENSIONS:
        raise InvalidFileError("Invalid file type")
    return f"{organization_id}/{institution_id}/{document_id}.{safe_ext}"


def delete_file(file_path: str) -> None:
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass


def format_file_size(size_bytes: int) -> str:
    """Human-readable file size, e.g. '1.4 MB'."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 ** 3:
        return f"{size_bytes / 1024 ** 2:.1f} MB"
    else:
        return f"{size_bytes / 1024 ** 3:.1f} GB"
