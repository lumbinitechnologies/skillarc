from typing import List
from langchain.text_splitter import RecursiveCharacterTextSplitter


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 150,
) -> List[str]:
    """Split text into overlapping chunks using LangChain's recursive
    character splitter, which tries to break on paragraph/sentence
    boundaries before falling back to hard splits."""
    if not text or not text.strip():
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )

    chunks = splitter.split_text(text)
    # Filter out trivially small/empty chunks
    return [c.strip() for c in chunks if c and len(c.strip()) > 10]
