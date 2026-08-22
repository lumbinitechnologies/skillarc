from typing import List, Dict, Any
from functools import lru_cache

from database.db import settings
from rag.embeddings import get_embedding_function

COLLECTION_NAME = "edurag_documents"


@lru_cache(maxsize=1)
def get_chroma_client() -> "chromadb.ClientAPI":
    import chromadb
    from chromadb.config import Settings as ChromaSettings

    return chromadb.PersistentClient(
        path=str(settings.CHROMA_DIR),
        settings=ChromaSettings(anonymized_telemetry=False),
    )


@lru_cache(maxsize=1)
def get_collection():
    client = get_chroma_client()
    # Pass the embedding function directly to the collection so Chroma
    # handles embedding internally (documents=... / query_texts=...)
    # instead of us calling embed_documents/embed_query manually.
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=get_embedding_function(),
        metadata={"hnsw:space": "cosine"},
    )


def add_chunks(
    document_id: str,
    filename: str,
    chunks: List[str],
    metadata: Dict[str, Any] | None = None,
    document_version: int = 1,
) -> int:
    """Embed and store chunks for a document. Returns number of chunks stored."""
    if not chunks:
        return 0

    required = {
        "organization_id", "institution_id", "department_id", "subject_id",
        "section_id", "owner_id", "visibility", "allowed_roles_json",
    }
    missing = required.difference(metadata or {})
    if missing:
        raise ValueError(f"missing validated vector metadata: {sorted(missing)}")

    collection = get_collection()

    # Versioned IDs make retries and reprocessing idempotent.
    collection.delete(where={"$and": [
        {"document_id": {"$eq": document_id}},
        {"document_version": {"$eq": document_version}},
    ]})
    ids = [f"{document_id}:v{document_version}:{i}" for i in range(len(chunks))]
    base_metadata = dict(metadata or {})
    base_metadata.update({
        "document_id": document_id,
        "filename": filename,
        "document_version": document_version,
    })
    metadatas = [{**base_metadata, "chunk_index": i} for i in range(len(chunks))]

    # No need to embed manually — Chroma calls the collection's
    # embedding_function on these documents internally.
    collection.add(
        ids=ids,
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


def delete_document_version_chunks(document_id: str, document_version: int) -> None:
    collection = get_collection()
    try:
        collection.delete(where={"$and": [
            {"document_id": {"$eq": document_id}},
            {"document_version": {"$eq": document_version}},
        ]})
    except Exception:
        pass


def clear_all() -> None:
    """Delete the entire collection (used by 'Clear Database')."""
    client = get_chroma_client()
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    # Reset caches so the next call recreates a fresh collection/client
    get_collection.cache_clear()


def similarity_search(
    query: str,
    top_k: int = 4,
    where: Dict[str, Any] | None = None,
) -> List[Dict[str, Any]]:
    """Return top_k most similar chunks with metadata and similarity score."""
    collection = get_collection()

    if collection.count() == 0:
        return []

    # No need to embed manually — pass query_texts and let Chroma's
    # embedding_function handle it internally.
    query_kwargs: Dict[str, Any] = {
        "query_texts": [query],
        "n_results": min(top_k, max(collection.count(), 1)),
    }
    if where:
        query_kwargs["where"] = where
    results = collection.query(**query_kwargs)

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
                "institution_id": metadatas[i].get("institution_id"),
                "organization_id": metadatas[i].get("organization_id"),
                "department_id": metadatas[i].get("department_id"),
                "subject_id": metadatas[i].get("subject_id"),
                "section_id": metadatas[i].get("section_id"),
                "owner_id": metadatas[i].get("owner_id"),
                "visibility": metadatas[i].get("visibility"),
                "score": score,
            }
        )

    return output
