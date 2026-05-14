"""
Internal data classes for cross-module communication.
Keeps models.py as API-only Pydantic; these are internal contracts.
"""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class CppChunkResult:
    """A single CPP chunk returned from pgvector similarity search."""

    id: str
    domain: str
    section: str
    chunk_text: str
