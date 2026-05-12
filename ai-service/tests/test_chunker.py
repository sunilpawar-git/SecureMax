"""Tests for semantic chunking engine — Phase 3 verification."""

from chunker import (
    CHUNK_TARGET_TOKENS,
    chunk_document,
    chunk_section,
    content_hash,
    estimate_tokens,
    split_into_sections,
)


class TestEstimateTokens:
    def test_empty_string_returns_1(self) -> None:
        assert estimate_tokens("") == 1

    def test_short_string(self) -> None:
        assert estimate_tokens("hello world") == 2

    def test_approximation_is_reasonable(self) -> None:
        text = "a" * 400
        assert 80 <= estimate_tokens(text) <= 120


class TestContentHash:
    def test_deterministic(self) -> None:
        assert content_hash("test") == content_hash("test")

    def test_different_inputs_different_hashes(self) -> None:
        assert content_hash("a") != content_hash("b")

    def test_strips_whitespace(self) -> None:
        assert content_hash("  test  ") == content_hash("test")

    def test_returns_hex_string(self) -> None:
        h = content_hash("test")
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)


class TestSplitIntoSections:
    def test_single_section_with_heading(self) -> None:
        text = "1.1 Access Control\nGates must be locked at all times."
        sections = split_into_sections(text)
        assert len(sections) >= 1
        assert any("Access Control" in s[0] or "Access Control" in s[1] for s in sections)

    def test_multiple_sections(self) -> None:
        text = (
            "1.1 Perimeter Security\nFences and walls.\n"
            "1.2 Access Control\nGates and badges.\n"
            "1.3 CCTV\nCamera coverage."
        )
        sections = split_into_sections(text)
        assert len(sections) >= 2

    def test_plain_text_without_headings(self) -> None:
        text = "This is a plain paragraph with no headings at all."
        sections = split_into_sections(text)
        assert len(sections) >= 1


class TestChunkSection:
    def test_short_section_returns_single_chunk(self) -> None:
        chunks = chunk_section("Test Heading", "Short body text.")
        assert len(chunks) == 1
        assert "Test Heading" in chunks[0]
        assert "Short body text." in chunks[0]

    def test_long_section_returns_multiple_chunks(self) -> None:
        body = ". ".join(
            ["This is a moderately long sentence number " + str(i) for i in range(100)]
        )
        chunks = chunk_section("Long Section", body)
        assert len(chunks) > 1

    def test_each_chunk_contains_heading(self) -> None:
        body = ". ".join(["Sentence " + str(i) + " with some padding text" for i in range(100)])
        chunks = chunk_section("My Heading", body)
        for chunk in chunks:
            assert "My Heading" in chunk

    def test_chunks_respect_token_limit(self) -> None:
        body = ". ".join(["Word " * 20 for _ in range(50)])
        chunks = chunk_section("Heading", body)
        for chunk in chunks:
            tokens = estimate_tokens(chunk)
            assert tokens <= CHUNK_TARGET_TOKENS * 1.5, f"Chunk has {tokens} tokens"


class TestChunkDocument:
    def test_returns_list_of_dicts(self) -> None:
        text = "1.1 Test Section\nSome content here."
        result = chunk_document(text, "CPP-01")
        assert isinstance(result, list)
        assert len(result) >= 1

    def test_each_chunk_has_required_fields(self) -> None:
        text = "1.1 Physical Security\nPerimeter fencing is critical."
        result = chunk_document(text, "CPP-01")
        for chunk in result:
            assert "domain" in chunk
            assert "section" in chunk
            assert "chunk_text" in chunk
            assert "content_hash" in chunk
            assert "token_estimate" in chunk
            assert chunk["domain"] == "CPP-01"

    def test_content_hashes_are_unique_per_chunk(self) -> None:
        text = (
            "1.1 Section A\nContent for section A is unique.\n"
            "1.2 Section B\nContent for section B is different."
        )
        result = chunk_document(text, "CPP-01")
        hashes = [c["content_hash"] for c in result]
        assert len(hashes) == len(set(hashes))

    def test_domain_propagated_correctly(self) -> None:
        text = "1.1 Crisis Response\nEvacuation plan details."
        result = chunk_document(text, "CPP-03")
        assert all(c["domain"] == "CPP-03" for c in result)
