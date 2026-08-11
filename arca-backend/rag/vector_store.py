from typing import List, Dict, Any, Optional
from functools import lru_cache

import chromadb
from chromadb.config import Settings as ChromaSettings

from database.db import settings
from rag.embeddings import get_embedding_function

COLLECTION_NAME = "edurag_documents"


@lru_cache(maxsize=1)
def get_chroma_client() -> "chromadb.ClientAPI":
    return chromadb.PersistentClient(
        path=str(settings.CHROMA_DIR),
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def get_collection():
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def add_chunks(
    document_id: str,
    filename: str,
    chunks: List[str],
) -> int:
    """Embed and store chunks for a document. Returns number of chunks stored."""
    if not chunks:
        return 0

    collection = get_collection()
    embed_fn = get_embedding_function()

    ids = [f"{document_id}_{i}" for i in range(len(chunks))]
    metadatas = [
        {"document_id": document_id, "filename": filename, "chunk_index": i}
        for i in range(len(chunks))
    ]

    vectors = embed_fn.embed_documents(chunks)

    collection.add(
        ids=ids,
        embeddings=vectors,
        documents=chunks,
        metadatas=metadatas,
    )

    return len(chunks)


def delete_document_chunks(document_id: str) -> None:
    collection = get_collection()
    try:
        collection.delete(where={"document_id": document_id})
    except Exception:
        # Collection may be empty or id not present; safe to ignore
        pass


def clear_all() -> None:
    """Delete the entire collection (used by 'Clear Database')."""
    client = get_chroma_client()
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass


def similarity_search(query: str, top_k: int = 4) -> List[Dict[str, Any]]:
    """Return top_k most similar chunks with metadata and similarity score."""
    collection = get_collection()
    embed_fn = get_embedding_function()

    if collection.count() == 0:
        return []

    query_vector = embed_fn.embed_query(query)

    results = collection.query(
        query_embeddings=[query_vector],
        n_results=min(top_k, max(collection.count(), 1)),
    )

    output = []
    ids = results.get("ids", [[]])[0]
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    for i in range(len(ids)):
        # Chroma cosine distance -> similarity score (1 - distance)
        score = 1 - distances[i] if i < len(distances) else None
        output.append(
            {
                "id": ids[i],
                "text": documents[i],
                "document_id": metadatas[i].get("document_id"),
                "filename": metadatas[i].get("filename"),
                "chunk_index": metadatas[i].get("chunk_index"),
                "score": score,
            }
        )

    return output
