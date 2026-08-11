from functools import lru_cache

from chromadb.utils import embedding_functions


@lru_cache(maxsize=1)
def get_embedding_function():
    """
    Return a cached, lightweight ONNX-based embedding function.

    This uses Chromadb's built-in DefaultEmbeddingFunction, which runs
    all-MiniLM-L6-v2 via onnxruntime directly (no PyTorch, no
    sentence-transformers). This avoids pulling ~200-400MB of torch runtime
    into memory, which was causing OOM kills (exit 137) on Render's 512MB
    free instance.

    Cached so the model is only loaded into memory once per process.
    """
    return embedding_functions.DefaultEmbeddingFunction()