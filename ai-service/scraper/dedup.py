"""
Deduplication engine for threat intel articles.
Uses URL hash + content hash for idempotent ingestion.
"""


class DedupStore:
    """In-memory dedup store for testing. Production uses DB lookups."""

    def __init__(self) -> None:
        self._url_hashes: set[str] = set()
        self._content_hashes: set[str] = set()

    def is_duplicate(self, url_hash: str, content_hash: str) -> bool:
        return url_hash in self._url_hashes or content_hash in self._content_hashes

    def mark_seen(self, url_hash: str, content_hash: str) -> None:
        self._url_hashes.add(url_hash)
        self._content_hashes.add(content_hash)

    def reset(self) -> None:
        self._url_hashes.clear()
        self._content_hashes.clear()

    @property
    def count(self) -> int:
        return len(self._url_hashes)
