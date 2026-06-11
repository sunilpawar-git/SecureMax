"""
SSOT configuration for FastAPI AI service.
All environment variables and constants centralised here.
"""

from pydantic_settings import BaseSettings

_REQUIRED_IN_PROD = ("database_url", "gemini_api_key", "encryption_key")


class Settings(BaseSettings):
    # Database URLs: separate roles for security isolation
    database_url: str = ""  # Legacy fallback (don't use in production)
    database_read_url: str = ""  # ai_readonly role (SELECT only)
    database_write_url: str = ""  # app_user role (read + audit writes)
    scraper_database_url: str = ""  # scraper_user role (threat_intel writes)

    gemini_api_key: str = ""
    encryption_key: str = ""
    allow_insecure_local: bool = False
    dev_bypass_session_check: bool = False

    gemini_region: str = "asia-south1"
    admin_email: str = ""
    news_api_key: str = ""

    ai_rate_limit_seconds: int = 15
    max_sessions_per_user_per_month: int = 3
    embedding_dimensions: int = 3072
    embedding_chunk_tokens: int = 400
    embedding_overlap_tokens: int = 50
    embedding_model: str = "models/gemini-embedding-2"
    generation_model_fast: str = "models/gemini-2.0-flash"
    generation_model_pro: str = "models/gemini-2.5-pro"
    cpp_retrieval_top_k: int = 3
    newsletter_quality_threshold: float = 0.6
    newsletter_max_articles: int = 15

    model_config = {"env_file": ".env", "extra": "ignore"}

    def get_read_url(self) -> str:
        """Get URL for read-only queries (SELECT only)."""
        return self.database_read_url or self.database_url

    def get_write_url(self) -> str:
        """Get URL for write queries (INSERT/UPDATE/DELETE)."""
        return self.database_write_url or self.database_url

    def get_scraper_url(self) -> str:
        """Get URL for scraper (threat_intel writes)."""
        return self.scraper_database_url or self.database_write_url or self.database_url


def get_settings() -> Settings:
    settings = Settings()
    if not settings.allow_insecure_local:
        missing = [v.upper() for v in _REQUIRED_IN_PROD if not getattr(settings, v)]
        if missing:
            raise RuntimeError(
                f"Missing required environment variables: {', '.join(missing)}. "
                "Set ALLOW_INSECURE_LOCAL=true only for local development."
            )
    return settings


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
