"""Compatibility-stable Arca LLM facade; the active provider is Groq."""

from rag.gemini_client import (
    ACADEMIC_DATA_RULES, CONTEXT_USAGE_RULES, FALLBACK_ANSWER,
    IDENTITY_TEMPLATE, build_prompt, generate_answer, generate_answer_stream,
    build_public_prompt, generate_public_answer_stream,
)

__all__ = ["ACADEMIC_DATA_RULES", "CONTEXT_USAGE_RULES", "FALLBACK_ANSWER", "IDENTITY_TEMPLATE", "build_prompt", "generate_answer", "generate_answer_stream", "build_public_prompt", "generate_public_answer_stream"]
