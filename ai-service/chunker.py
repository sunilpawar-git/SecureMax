"""
Semantic chunking engine for CPP Seven Precis (markdown and PDF text).
Splits on section headings (markdown # and numbered), targets ~400 tokens
per chunk with 50-token overlap. Strips HTML noise and TOC artifacts.
Pure functions — no I/O, fully testable.
"""

import hashlib
import re

CHUNK_TARGET_TOKENS = 400
CHUNK_OVERLAP_TOKENS = 50
APPROX_CHARS_PER_TOKEN = 4

HEADING_PATTERN = re.compile(
    r"^(?:"
    r"#{1,4}\s+.+|"  # Markdown headings: # ## ### ####
    r"\d+\.\d+\s+[A-Z].+|"  # Numbered sections: 1.0 Introduction (requires sub-number)
    r"\d+\s+[A-Z][A-Z].+|"  # Numbered sections: 1 INTRODUCTION (digit + ALLCAPS)
    r"[A-Z][A-Z\s]{3,}$|"  # ALL CAPS headings
    r"Chapter\s+\d+|"
    r"Section\s+\d+"
    r")",
    re.MULTILINE,
)

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_DETAILS_BLOCK_RE = re.compile(r"<details>.*?</details>", re.DOTALL | re.IGNORECASE)
_TOC_LINK_RE = re.compile(r"^\s*\*\s*\[.+?\]\(#.+?\)\s*$", re.MULTILINE)
_MD_HEADING_HASH_RE = re.compile(r"^#{1,4}\s+", re.MULTILINE)


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // APPROX_CHARS_PER_TOKEN)


def content_hash(text: str) -> str:
    return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()


def _clean_text(text: str) -> str:
    """Strip HTML noise, TOC links, and details blocks from raw text."""
    text = _DETAILS_BLOCK_RE.sub("", text)
    text = _TOC_LINK_RE.sub("", text)
    text = _HTML_TAG_RE.sub("", text)
    return text.strip()


def split_into_sections(text: str) -> list[tuple[str, str]]:
    """Split document text into (heading, body) pairs based on section headings."""
    text = _clean_text(text)

    parts = HEADING_PATTERN.split(text)
    headings = HEADING_PATTERN.findall(text)

    sections: list[tuple[str, str]] = []
    if parts and parts[0].strip():
        sections.append(("Introduction", parts[0].strip()))

    for i, heading in enumerate(headings):
        body_idx = i + 1
        if body_idx < len(parts) and parts[body_idx].strip():
            clean_heading = _MD_HEADING_HASH_RE.sub("", heading).strip()
            sections.append((clean_heading or heading.strip(), parts[body_idx].strip()))

    return sections


def chunk_section(heading: str, body: str) -> list[str]:
    """Split a section body into overlapping chunks of ~400 tokens.
    Avoids splitting mid-list by treating lines starting with - or digit as atomic."""
    target_chars = CHUNK_TARGET_TOKENS * APPROX_CHARS_PER_TOKEN
    overlap_chars = CHUNK_OVERLAP_TOKENS * APPROX_CHARS_PER_TOKEN

    if estimate_tokens(body) <= CHUNK_TARGET_TOKENS:
        return [f"{heading}\n\n{body}"]

    units = _split_preserving_lists(body)
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for unit in units:
        ulen = len(unit)
        if current_len + ulen > target_chars and current:
            chunk_text = f"{heading}\n\n{''.join(current)}"
            chunks.append(chunk_text)

            overlap_text = ""
            for u in reversed(current):
                if len(overlap_text) + len(u) > overlap_chars:
                    break
                overlap_text = u + overlap_text
            current = [overlap_text] if overlap_text.strip() else []
            current_len = len(overlap_text)

        current.append(unit)
        current_len += ulen

    if current:
        chunk_text = f"{heading}\n\n{''.join(current)}"
        chunks.append(chunk_text)

    return chunks


def _split_preserving_lists(body: str) -> list[str]:
    """Split body into sentence/list-item units without breaking list items."""
    lines = body.split("\n")
    units: list[str] = []
    current_paragraph: list[str] = []

    for line in lines:
        stripped = line.strip()
        is_list_item = bool(re.match(r"^[-*+]\s", stripped) or re.match(r"^\d+\.\s", stripped))

        if is_list_item:
            if current_paragraph:
                para_text = " ".join(current_paragraph)
                units.extend(_split_into_sentences(para_text))
                current_paragraph = []
            units.append(line + "\n")
        elif stripped == "":
            if current_paragraph:
                para_text = " ".join(current_paragraph)
                units.extend(_split_into_sentences(para_text))
                current_paragraph = []
            units.append("\n")
        else:
            current_paragraph.append(stripped)

    if current_paragraph:
        para_text = " ".join(current_paragraph)
        units.extend(_split_into_sentences(para_text))

    return units


def _split_into_sentences(text: str) -> list[str]:
    """Split a paragraph into sentences."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s + " " for s in sentences if s.strip()]


def chunk_document(text: str, domain: str) -> list[dict]:
    """Full pipeline: text → sections → chunks with metadata."""
    sections = split_into_sections(text)
    results: list[dict] = []

    for heading, body in sections:
        for chunk_text in chunk_section(heading, body):
            results.append(
                {
                    "domain": domain,
                    "section": heading,
                    "chunk_text": chunk_text,
                    "content_hash": content_hash(chunk_text),
                    "token_estimate": estimate_tokens(chunk_text),
                }
            )

    return results
