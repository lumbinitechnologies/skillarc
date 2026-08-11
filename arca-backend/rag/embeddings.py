from functools import lru_cache

from langchain_huggingface import HuggingFaceEmbeddings

from database.db import settings


@lru_cache(maxsize=1)
def get_embedding_function() -> HuggingFaceEmbeddings:
    """Return a cached HuggingFace sentence-transformer embedding function.
    Cached so the model is only loaded into memory once per process."""
    return HuggingFaceEmbeddings(
        model_name=settings.EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )
