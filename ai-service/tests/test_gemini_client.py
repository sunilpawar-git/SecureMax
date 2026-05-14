"""Tests for gemini_client — thin async wrapper around genai.Client."""

from unittest.mock import MagicMock, patch

import pytest

from gemini_client import GeminiClient, GeminiError


@pytest.fixture()
def mock_settings():
    settings = MagicMock()
    settings.gemini_api_key = "test-key-123"
    return settings


class TestGeminiClientInit:
    def test_requires_api_key(self) -> None:
        settings = MagicMock()
        settings.gemini_api_key = ""
        with pytest.raises(ValueError, match="GEMINI_API_KEY"):
            GeminiClient(settings)

    def test_accepts_valid_key(self, mock_settings) -> None:
        client = GeminiClient(mock_settings)
        assert client is not None


class TestGeminiGenerate:
    @patch("gemini_client.genai.Client")
    def test_returns_text_response(self, mock_cls, mock_settings) -> None:
        mock_genai = MagicMock()
        response = MagicMock()
        response.text = "Generated summary text"
        mock_genai.models.generate_content.return_value = response
        mock_cls.return_value = mock_genai

        client = GeminiClient(mock_settings)
        result = client._generate_sync("test prompt", "models/gemini-2.5-pro")
        assert result == "Generated summary text"

    @patch("gemini_client.genai.Client")
    def test_retries_on_server_error(self, mock_cls, mock_settings) -> None:
        mock_genai = MagicMock()
        response = MagicMock()
        response.text = "OK after retry"
        mock_genai.models.generate_content.side_effect = [
            Exception("503 Service Unavailable"),
            response,
        ]
        mock_cls.return_value = mock_genai

        client = GeminiClient(mock_settings, max_retries=2, retry_delay=0.0)
        result = client._generate_sync("prompt", "models/gemini-2.5-pro")
        assert result == "OK after retry"
        assert mock_genai.models.generate_content.call_count == 2

    @patch("gemini_client.genai.Client")
    def test_raises_after_max_retries(self, mock_cls, mock_settings) -> None:
        mock_genai = MagicMock()
        mock_genai.models.generate_content.side_effect = Exception("500 error")
        mock_cls.return_value = mock_genai

        client = GeminiClient(mock_settings, max_retries=2, retry_delay=0.0)
        with pytest.raises(GeminiError, match="after 2 retries"):
            client._generate_sync("prompt", "models/gemini-2.5-pro")


class TestGeminiEmbed:
    @patch("gemini_client.genai.Client")
    def test_returns_float_list(self, mock_cls, mock_settings) -> None:
        mock_genai = MagicMock()
        embedding_obj = MagicMock()
        embedding_obj.values = [0.1, 0.2, 0.3]
        result_obj = MagicMock()
        result_obj.embeddings = [embedding_obj]
        mock_genai.models.embed_content.return_value = result_obj
        mock_cls.return_value = mock_genai

        client = GeminiClient(mock_settings)
        embedding = client._embed_sync("test query", "models/gemini-embedding-2")
        assert embedding == [0.1, 0.2, 0.3]
        assert all(isinstance(v, float) for v in embedding)

    @patch("gemini_client.genai.Client")
    def test_embed_retries_on_failure(self, mock_cls, mock_settings) -> None:
        mock_genai = MagicMock()
        embedding_obj = MagicMock()
        embedding_obj.values = [0.5] * 10
        result_obj = MagicMock()
        result_obj.embeddings = [embedding_obj]
        mock_genai.models.embed_content.side_effect = [
            RuntimeError("transient"),
            result_obj,
        ]
        mock_cls.return_value = mock_genai

        client = GeminiClient(mock_settings, max_retries=2, retry_delay=0.0)
        embedding = client._embed_sync("query", "models/gemini-embedding-2")
        assert len(embedding) == 10

    @patch("gemini_client.genai.Client")
    def test_embed_raises_after_max_retries(self, mock_cls, mock_settings) -> None:
        mock_genai = MagicMock()
        mock_genai.models.embed_content.side_effect = RuntimeError("down")
        mock_cls.return_value = mock_genai

        client = GeminiClient(mock_settings, max_retries=2, retry_delay=0.0)
        with pytest.raises(GeminiError, match="after 2 retries"):
            client._embed_sync("query", "models/gemini-embedding-2")
