"""Authentication and authorization primitives for the private backend."""

from .dependencies import Principal, require_principal

__all__ = ["Principal", "require_principal"]
