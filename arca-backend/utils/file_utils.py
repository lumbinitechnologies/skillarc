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


async def save_upload_file(file: UploadFile, ext: str) -> tuple[str, int]:
    """Persist an uploaded file to disk with a unique name.
    Returns (saved_path, file_size_bytes)."""
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    destination = settings.UPLOAD_DIR / unique_name

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
