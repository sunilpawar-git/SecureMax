"""Tests for chunker.py markdown enhancement — headings, HTML stripping, list preservation."""

from chunker import chunk_document, split_into_sections


class TestMarkdownHeadings:
    def test_recognises_hash_headings(self) -> None:
        text = "# Chapter 1\n\nFirst content.\n\n## Section 1.1\n\nSecond content."
        sections = split_into_sections(text)
        assert len(sections) >= 2
        headings = [s[0] for s in sections]
        assert any("Chapter 1" in h for h in headings)
        assert any("Section 1.1" in h for h in headings)

    def test_recognises_triple_hash(self) -> None:
        text = "### Subsection\n\nParagraph here with detail."
        sections = split_into_sections(text)
        assert len(sections) >= 1
        assert any("Subsection" in s[0] for s in sections)

    def test_preserves_numbered_headings(self) -> None:
        text = "1.0 Introduction\n\nOpening text.\n\n2.0 Methodology\n\nSecond text."
        sections = split_into_sections(text)
        headings = [s[0] for s in sections]
        assert any("Introduction" in h or "1.0" in h for h in headings)


class TestHtmlStripping:
    def test_strips_details_blocks(self) -> None:
        text = (
            "# Overview\n\n<details><summary>TOC</summary>\n- Item\n</details>\n\nActual content."
        )
        sections = split_into_sections(text)
        all_text = " ".join(s[1] for s in sections)
        assert "<details>" not in all_text
        assert "Actual content" in all_text

    def test_strips_html_tags(self) -> None:
        text = "# Title\n\n<p>This is a <strong>paragraph</strong>.</p>"
        sections = split_into_sections(text)
        all_text = " ".join(s[1] for s in sections)
        assert "<p>" not in all_text
        assert "<strong>" not in all_text
        assert "paragraph" in all_text

    def test_strips_toc_links(self) -> None:
        text = "# Title\n\n* [Chapter 1](#chapter-1)\n* [Chapter 2](#chapter-2)\n\nReal content."
        sections = split_into_sections(text)
        all_text = " ".join(s[1] for s in sections)
        assert "[Chapter 1](#chapter-1)" not in all_text
        assert "Real content" in all_text


class TestListPreservation:
    def test_preserves_bullet_list_items_in_chunk(self) -> None:
        text = (
            "# Controls\n\n"
            "Key security controls:\n"
            "- Perimeter fencing\n"
            "- CCTV surveillance\n"
            "- Access control systems\n"
            "- Guard patrols"
        )
        chunks = chunk_document(text, "CPP-01")
        assert len(chunks) >= 1
        chunk_text = chunks[0]["chunk_text"]
        assert "Perimeter fencing" in chunk_text
        assert "CCTV surveillance" in chunk_text

    def test_preserves_numbered_list(self) -> None:
        text = (
            "# Steps\n\n"
            "Follow these steps:\n"
            "1. Assess the perimeter\n"
            "2. Identify blind spots\n"
            "3. Deploy countermeasures"
        )
        chunks = chunk_document(text, "CPP-01")
        assert len(chunks) >= 1
        chunk_text = chunks[0]["chunk_text"]
        assert "Assess the perimeter" in chunk_text


class TestBackwardCompatibility:
    def test_existing_numbered_headings_still_work(self) -> None:
        text = "1.0 Introduction\n\nFirst paragraph.\n\n2.0 Methods\n\nSecond paragraph."
        sections = split_into_sections(text)
        assert len(sections) >= 2

    def test_content_hash_stable(self) -> None:
        from chunker import content_hash

        assert content_hash("test") == content_hash("test")
        assert content_hash("test") != content_hash("test2")

    def test_chunk_document_returns_expected_structure(self) -> None:
        text = "# Title\n\nBody text for testing."
        chunks = chunk_document(text, "CPP-01")
        assert len(chunks) >= 1
        chunk = chunks[0]
        assert "domain" in chunk
        assert "section" in chunk
        assert "chunk_text" in chunk
        assert "content_hash" in chunk
        assert "token_estimate" in chunk
        assert chunk["domain"] == "CPP-01"
