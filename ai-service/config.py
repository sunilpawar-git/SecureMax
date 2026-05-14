"""
SSOT configuration for FastAPI AI service.
All environment variables and constants centralised here.
"""

import os

from pydantic_settings import BaseSettings

_REQUIRED_IN_PROD = ("DATABASE_URL", "GEMINI_API_KEY", "ENCRYPTION_KEY")


def _assert_prod_vars() -> None:
    """Fail fast if any required credential is absent outside test environments."""
    if os.environ.get("ALLOW_INSECURE_LOCAL", "").lower() == "true":
        return
    missing = [v for v in _REQUIRED_IN_PROD if not os.environ.get(v)]
    if missing:
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}. "
            "Set ALLOW_INSECURE_LOCAL=true only for local development."
        )


class Settings(BaseSettings):
    database_url: str = ""
    gemini_api_key: str = ""
    encryption_key: str = ""

    gemini_region: str = "asia-south1"
    admin_email: str = ""
    news_api_key: str = ""

    ai_rate_limit_seconds: int = 15
    max_sessions_per_user_per_month: int = 3
    embedding_dimensions: int = 3072
    embedding_chunk_tokens: int = 400
    embedding_overlap_tokens: int = 50
    embedding_model: str = "models/gemini-embedding-2"
    cpp_retrieval_top_k: int = 3

    model_config = {"env_file": ".env", "extra": "ignore"}


def get_settings() -> Settings:
    _assert_prod_vars()
    return Settings()


# CPP Domain constants — SSOT, shared with frontend via API
CPP_DOMAINS = {
    "CPP-01": "Physical Security",
    "CPP-02": "Business Principles",
    "CPP-03": "Crisis Management",
    "CPP-04": "Investigations",
    "CPP-05": "Information Security",
    "CPP-06": "Personnel Security",
    "CPP-07": "Security Management",
}

SEVERITY_ORDER = ["critical", "high", "medium", "low"]

TRACK_HNI = "hni"
TRACK_ENTERPRISE = "enterprise"
