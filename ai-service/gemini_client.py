"""
Thin async wrapper around google-genai Client.
SSOT for all Gemini API calls: generation and embedding.
Retry with exponential backoff on transient failures.
"""

import asyncio
import logging
import time

from google import genai

from config import Settings

logger = logging.getLogger(__name__)

_DEFAULT_MAX_RETRIES = 3
_DEFAULT_RETRY_DELAY = 1.0
_DEFAULT_GENERATION_MODEL = "models/gemini-2.5-pro"
_DEFAULT_EMBEDDING_MODEL = "models/gemini-embedding-2"


class GeminiError(Exception):
    """Raised when a Gemini API call fails after exhausting retries."""


class GeminiClient:
    """Wraps genai.Client with retry logic. Thread-safe for sync calls,
    async methods dispatch to a thread pool via asyncio.to_thread."""

    def __init__(
        self,
        settings: Settings,
        *,
        max_retries: int = _DEFAULT_MAX_RETRIES,
        retry_delay: float = _DEFAULT_RETRY_DELAY,
    ) -> None:
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY must be set in environment")
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._max_retries = max_retries
        self._retry_delay = retry_delay

    def _generate_sync(self, prompt: str, model: str = _DEFAULT_GENERATION_MODEL) -> str:
        """Synchronous generation with retry. Not for direct use in async code."""
        last_exc: Exception | None = None
        for attempt in range(1, self._max_retries + 1):
            try:
                response = self._client.models.generate_content(
                    model=model,
                    contents=prompt,
                )
                text = response.text
                if not text:
                    raise GeminiError("Empty or blocked response from Gemini")
                return text
            except Exception as exc:
                last_exc = exc
                logger.warning(
                    "Gemini generate attempt %d/%d failed: %s",
                    attempt,
                    self._max_retries,
                    exc,
                )
                if attempt < self._max_retries:
                    time.sleep(self._retry_delay * attempt)
        raise GeminiError(
            f"Gemini generation failed after {self._max_retries} retries"
        ) from last_exc

    def _embed_sync(self, text: str, model: str = _DEFAULT_EMBEDDING_MODEL) -> list[float]:
        """Synchronous embedding with retry. Not for direct use in async code."""
        last_exc: Exception | None = None
        for attempt in range(1, self._max_retries + 1):
            try:
                result = self._client.models.embed_content(
                    model=model,
                    contents=text,
                )
                if not result.embeddings:
                    raise GeminiError("Empty embeddings returned from Gemini")
                return list(result.embeddings[0].values)
            except Exception as exc:
                last_exc = exc
                logger.warning(
                    "Gemini embed attempt %d/%d failed: %s",
                    attempt,
                    self._max_retries,
                    exc,
                )
                if attempt < self._max_retries:
                    time.sleep(self._retry_delay * attempt)
        raise GeminiError(
            f"Gemini embedding failed after {self._max_retries} retries"
        ) from last_exc

    async def generate(self, prompt: str, model: str = _DEFAULT_GENERATION_MODEL) -> str:
        """Async generation — dispatches to thread pool."""
        return await asyncio.to_thread(self._generate_sync, prompt, model)

    async def embed(self, text: str, model: str = _DEFAULT_EMBEDDING_MODEL) -> list[float]:
        """Async embedding — dispatches to thread pool."""
        return await asyncio.to_thread(self._embed_sync, text, model)
