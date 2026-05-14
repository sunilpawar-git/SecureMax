"""
SSOT configuration for FastAPI AI service.
All environment variables and constants centralised here.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Required — service will not function without these; fail loudly when missing.
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

    # Load from local .env only; ../env.local is for development convenience only
    model_config = {"env_file": ".env", "extra": "ignore"}


def get_settings() -> Settings:
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
