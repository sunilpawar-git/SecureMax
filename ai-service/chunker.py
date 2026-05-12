"""
Semantic chunking engine for CPP Seven Precis PDFs.
Splits on section headings, targets ~400 tokens per chunk with 50-token overlap.
Pure functions — no I/O, fully testable.
"""

import hashlib
import re

CHUNK_TARGET_TOKENS = 400
CHUNK_OVERLAP_TOKENS = 50
APPROX_CHARS_PER_TOKEN = 4

HEADING_PATTERN = re.compile(
    r"^(?:\d+\.?\d*\s+|[A-Z][A-Z\s]{3,}$|Chapter\s+\d+|Section\s+\d+)",
    re.MULTILINE,
)


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // APPROX_CHARS_PER_TOKEN)


def content_hash(text: str) -> str:
    return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()


def split_into_sections(text: str) -> list[tuple[str, str]]:
    """Split document text into (heading, body) pairs based on section headings."""
    parts = HEADING_PATTERN.split(text)
    headings = HEADING_PATTERN.findall(text)

    sections: list[tuple[str, str]] = []
    if parts and parts[0].strip():
        sections.append(("Introduction", parts[0].strip()))

    for i, heading in enumerate(headings):
        body_idx = i + 1
        if body_idx < len(parts) and parts[body_idx].strip():
            sections.append((heading.strip(), parts[body_idx].strip()))

    return sections


def chunk_section(heading: str, body: str) -> list[str]:
    """Split a section body into overlapping chunks of ~400 tokens."""
    target_chars = CHUNK_TARGET_TOKENS * APPROX_CHARS_PER_TOKEN
    overlap_chars = CHUNK_OVERLAP_TOKENS * APPROX_CHARS_PER_TOKEN

    if estimate_tokens(body) <= CHUNK_TARGET_TOKENS:
        return [f"{heading}\n\n{body}"]

    sentences = re.split(r"(?<=[.!?])\s+", body)
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for sentence in sentences:
        slen = len(sentence)
        if current_len + slen > target_chars and current:
            chunk_text = f"{heading}\n\n{' '.join(current)}"
            chunks.append(chunk_text)

            overlap_text = ""
            for s in reversed(current):
                if len(overlap_text) + len(s) > overlap_chars:
                    break
                overlap_text = s + " " + overlap_text
            current = [overlap_text.strip()] if overlap_text.strip() else []
            current_len = len(overlap_text)

        current.append(sentence)
        current_len += slen

    if current:
        chunk_text = f"{heading}\n\n{' '.join(current)}"
        chunks.append(chunk_text)

    return chunks


def chunk_document(text: str, domain: str) -> list[dict]:
    """Full pipeline: text → sections → chunks with metadata."""
    sections = split_into_sections(text)
    results: list[dict] = []

    for heading, body in sections:
        for chunk_text in chunk_section(heading, body):
            results.append({
                "domain": domain,
                "section": heading,
                "chunk_text": chunk_text,
                "content_hash": content_hash(chunk_text),
                "token_estimate": estimate_tokens(chunk_text),
            })

    return results
