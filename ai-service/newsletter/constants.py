"""
Newsletter-specific constants — SSOT for scoring, segments, brand, and thresholds.
Imported by gatekeeper, synthesis passes, and renderers.
"""

AUDIENCE_SEGMENTS = ("hni", "enterprise", "critical_infrastructure")

SEGMENT_LABELS: dict[str, str] = {
    "hni": "For Private Residences",
    "enterprise": "For Corporates & Institutions",
    "critical_infrastructure": "For Critical Infrastructure",
}

# --- Intelligence scoring weights (must sum to 1.0) ---

INTEL_SCORE_WEIGHTS: dict[str, float] = {
    "physical_security_relevance": 0.25,
    "geographic_relevance": 0.20,
    "threat_actionability": 0.20,
    "educational_value": 0.15,
    "recency_novelty": 0.10,
    "audience_impact": 0.10,
}

NEWSLETTER_QUALITY_THRESHOLD = 0.6

# --- Newsletter content limits ---

MAX_NEWSLETTER_THEMES = 5
MAX_NEWSLETTER_ARTICLES = 15

# --- Brand palette (shared across all renderers) ---

COLOR_BG = "#0f172a"
COLOR_CARD = "#1e293b"
COLOR_TEXT = "#f1f5f9"
COLOR_MUTED = "#94a3b8"
COLOR_ACCENT = "#f59e0b"

BRAND_NAME = "Raivan Global"
BRAND_TAGLINE = "Security Consulting — Weekly Threat Intelligence"
BRAND_SIGN_OFF = "Raivan Global — Securing What Matters"
