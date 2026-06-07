"""Tests for CPP-grounded conversational AI assistant."""

from unittest.mock import AsyncMock, patch

import pytest

from schemas import CppChunkResult


@pytest.fixture(autouse=True)
def _clear_rate_limit():
    """Reset the in-memory rate limiter between tests."""
    from routers.assistant import _rate_limit_map

    _rate_limit_map.clear()
    yield
    _rate_limit_map.clear()


class TestAssistantEndpoint:
    def test_ask_returns_answer_with_citations(self, test_client) -> None:
        """Successful query returns answer + citations."""
        fake_chunks = [
            CppChunkResult(
                id="c1",
                domain="CPP-01",
                section="Access Control",
                chunk_text="Locks must be tested.",
            ),
            CppChunkResult(
                id="c2",
                domain="CPP-05",
                section="InfoSec",
                chunk_text="Encrypt all data at rest.",
            ),
        ]

        with patch(
            "routers.assistant.get_relevant_chunks",
            new_callable=AsyncMock,
            return_value=fake_chunks,
        ):
            test_client.app.state.gemini = _FakeGemini("Per CPP-01, secure all access points.")
            resp = test_client.post(
                "/assistant/ask",
                json={"question": "How do I secure my front gate?"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert "CPP-01" in data["answer"]
        assert len(data["citations"]) == 2
        assert "CPP-01" in data["domains_referenced"]
        assert "CPP-05" in data["domains_referenced"]

    def test_ask_without_gemini_returns_unavailable(self, test_client) -> None:
        """If gemini is None, return graceful fallback."""
        test_client.app.state.gemini = None
        resp = test_client.post(
            "/assistant/ask",
            json={"question": "What is physical security?"},
        )
        assert resp.status_code == 200
        assert "unavailable" in resp.json()["answer"].lower()

    def test_ask_validates_short_question(self, test_client) -> None:
        """Question must be at least 3 characters."""
        test_client.app.state.gemini = _FakeGemini("ok")
        resp = test_client.post(
            "/assistant/ask",
            json={"question": "ab"},
        )
        assert resp.status_code == 422

    def test_ask_passes_domains_filter(self, test_client) -> None:
        """domains parameter is forwarded to get_relevant_chunks."""
        captured_kwargs: dict = {}

        async def mock_chunks(*args, **kwargs):
            captured_kwargs.update(kwargs)
            return []

        with patch(
            "routers.assistant.get_relevant_chunks",
            side_effect=mock_chunks,
        ):
            test_client.app.state.gemini = _FakeGemini("answer")
            test_client.post(
                "/assistant/ask",
                json={"question": "CCTV best practices", "domains": ["CPP-01"]},
            )

        assert captured_kwargs.get("domains") == ["CPP-01"]

    def test_ask_handles_gemini_error(self, test_client) -> None:
        """If Gemini fails, return graceful error message."""
        with patch(
            "routers.assistant.get_relevant_chunks",
            new_callable=AsyncMock,
            return_value=[],
        ):
            test_client.app.state.gemini = _FailingGemini()
            resp = test_client.post(
                "/assistant/ask",
                json={"question": "What is ESRM methodology?"},
            )

        assert resp.status_code == 200
        assert "unable" in resp.json()["answer"].lower()


class _FakeGemini:
    def __init__(self, response: str):
        self._response = response

    async def embed(self, text: str) -> list[float]:
        return [0.0] * 3072

    async def generate(self, prompt: str, model: str = "") -> str:
        return self._response


class _FailingGemini:
    async def embed(self, text: str) -> list[float]:
        return [0.0] * 3072

    async def generate(self, prompt: str, model: str = "") -> str:
        raise RuntimeError("Gemini quota exceeded")
