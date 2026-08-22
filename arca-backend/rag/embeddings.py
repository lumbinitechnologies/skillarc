from functools import lru_cache
import hashlib
import os


class HashEmbeddingFunction:
    """Small deterministic embedding used only by disposable integration tests."""

    def __call__(self, input):
        vectors = []
        for value in input:
            digest = hashlib.sha256(value.encode("utf-8")).digest()
            vectors.append([(digest[index % len(digest)] / 127.5) - 1.0 for index in range(32)])
        return vectors

    def name(self):
        return "task05-hash-embedding"

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
    if os.getenv("ARCA_EMBEDDING_BACKEND") == "hash":
        return HashEmbeddingFunction()

    from chromadb.utils import embedding_functions

    return embedding_functions.DefaultEmbeddingFunction()
