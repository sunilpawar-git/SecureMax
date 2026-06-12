"""
Newsletter-specific constants — SSOT for scoring, segments, brand, thresholds,
CPP domain labels, keyword-to-domain mappings, and fallback scorer term sets.
Imported by gatekeeper, synthesis passes, renderers, and pipeline.
"""

AUDIENCE_SEGMENTS = ("hni", "enterprise", "critical_infrastructure")

SEGMENT_LABELS: dict[str, str] = {
    "hni": "For Private Residences",
    "enterprise": "For Corporates & Institutions",
    "critical_infrastructure": "For Critical Infrastructure",
}

SEGMENT_SHORT_LABELS: dict[str, str] = {
    "hni": "HNI",
    "enterprise": "Enterprise",
    "critical_infrastructure": "Critical Infra",
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

# --- Generation job lifecycle (mirrors report_jobs) ---

NEWSLETTER_JOB_PENDING = "pending"
NEWSLETTER_JOB_PROCESSING = "processing"
NEWSLETTER_JOB_COMPLETED = "completed"
NEWSLETTER_JOB_FAILED = "failed"

# --- CPP domain labels (public-facing, plain English) ---

CPP_DOMAIN_LABELS: dict[str, str] = {
    "CPP-01": "Physical Security & Access Control",
    "CPP-02": "Risk Management & Business Continuity",
    "CPP-03": "Emergency & Crisis Response",
    "CPP-04": "Security Investigations",
    "CPP-05": "Information & Technology Security",
    "CPP-06": "Guard & Personnel Operations",
    "CPP-07": "Security Governance & Strategy",
}

# --- Threat keyword → CPP domain mapping (used by pipeline + gatekeeper fallback) ---
# Every term in PHYSICAL_SECURITY_TERMS that describes a specific threat type
# must have a domain mapping here so _fallback_process tags articles correctly.

DOMAIN_KEYWORD_MAP: dict[str, str] = {
    # CPP-01: Physical Security & Access Control
    "physical security": "CPP-01",
    "cctv": "CPP-01",
    "access control": "CPP-01",
    "perimeter": "CPP-01",
    "perimeter breach": "CPP-01",
    "surveillance": "CPP-01",
    "airport security": "CPP-01",
    "aviation security": "CPP-01",
    "terrorism": "CPP-01",
    "bomb": "CPP-01",
    "bomb blast": "CPP-01",
    "active shooter": "CPP-01",
    "vehicle attack": "CPP-01",
    "security breach": "CPP-01",
    "security incident": "CPP-01",
    "trespassing": "CPP-01",
    "burglary": "CPP-01",
    "break-in": "CPP-01",
    "theft": "CPP-01",
    # CPP-03: Emergency & Crisis Response
    "fire": "CPP-03",
    "fire safety": "CPP-03",
    "fire safety certificate": "CPP-03",
    "fire drill": "CPP-03",
    "blaze": "CPP-03",
    "arson": "CPP-03",
    "stampede": "CPP-03",
    "evacuation": "CPP-03",
    "emergency exit": "CPP-03",
    "building collapse": "CPP-03",
    "structural failure": "CPP-03",
    "crowd management": "CPP-03",
    "overcrowding": "CPP-03",
    "emergency response": "CPP-03",
    "industrial accident": "CPP-03",
    "chemical leak": "CPP-03",
    "factory explosion": "CPP-03",
    "noc": "CPP-03",
    # CPP-01: Physical Security — plain-language crime/incident terms used by general news
    "robbery": "CPP-01",
    "armed robbery": "CPP-01",
    "dacoity": "CPP-01",  # Indian term for armed gang robbery
    "shooting": "CPP-01",
    "blast": "CPP-01",
    "explosion": "CPP-01",
    "abduction": "CPP-06",  # synonym for kidnapping (→ CPP-06)
    "militant": "CPP-01",
    "extremist": "CPP-01",
    "heist": "CPP-01",
    # CPP-03: Emergency & Crisis Response — general disaster language
    "disaster": "CPP-03",
    "gas leak": "CPP-03",
    "hazmat": "CPP-03",
    "mass casualty": "CPP-03",
    # CPP-05: Information & Technology Security — cyber-security terms
    # (enables ingestion from cyber-focused feeds: Help Net, Dark Reading, SecurityWeek)
    "ransomware": "CPP-05",
    "malware": "CPP-05",
    "cyber attack": "CPP-05",
    "cyberattack": "CPP-05",
    "data breach": "CPP-05",
    "phishing": "CPP-05",
    "zero-day": "CPP-05",
    "hacking": "CPP-05",
    "cybersecurity": "CPP-05",
    "vulnerability": "CPP-05",
    "intrusion": "CPP-05",
    "intrusion detection": "CPP-05",
    "insider threat": "CPP-05",
    "drone attack": "CPP-05",
    "counter-drone": "CPP-05",
    # CPP-06: Guard & Personnel Operations
    "guard": "CPP-06",
    "patrol": "CPP-06",
    "guard patrol": "CPP-06",
    "theft prevention": "CPP-06",
    "kidnapping": "CPP-06",
    "ransom": "CPP-06",
    "carjacking": "CPP-06",
    "executive protection": "CPP-06",
    "vip security": "CPP-06",
    "workplace violence": "CPP-06",
    # CPP-07: Security Governance & Strategy
    "security audit": "CPP-07",
}

# --- Fallback scorer term sets ---

PHYSICAL_SECURITY_TERMS: frozenset[str] = frozenset(
    {
        "physical security",
        "cctv",
        "access control",
        "perimeter",
        "surveillance",
        "guard",
        "patrol",
        "intrusion",
        "break-in",
        "burglary",
        "theft",
        "trespassing",
        "fire safety",
        "emergency response",
        "security breach",
        "security incident",
        "workplace violence",
        "insider threat",
        "fire",
        "blaze",
        "arson",
        "stampede",
        "evacuation",
        "crowd management",
        "building collapse",
        "emergency exit",
        "overcrowding",
        "structural failure",
        "fire drill",
        "fire safety certificate",
        "noc",
        "drone attack",
        "counter-drone",
        "kidnapping",
        "ransom",
        "carjacking",
        "executive protection",
        "vip security",
        "terrorism",
        "bomb blast",
        "active shooter",
        "vehicle attack",
        "industrial accident",
        "chemical leak",
        "factory explosion",
        "airport security",
        "aviation security",
    }
)

INDIA_GEO_TERMS: frozenset[str] = frozenset(
    {
        # Administrative areas — prefer these over incident-specific venues
        "india",
        "indian",
        "delhi",
        "mumbai",
        "bangalore",
        "bengaluru",
        "hyderabad",
        "chennai",
        "kolkata",
        "pune",
        "ahmedabad",
        "jaipur",
        "lucknow",
        "gurgaon",
        "noida",
        "gated community",
        "housing society",
        "cisf",
        "crpf",
        "private security guard",
        "watchman",
        "goa",
        "surat",
        "nagpur",
        "chandigarh",
        "patna",
        "bhopal",
        "agra",
        "varanasi",
        "coimbatore",
        "kochi",
        "mangalore",
        "indore",
        "thiruvananthapuram",
        "visakhapatnam",
        "ranchi",
        "malviya nagar",
        "andheri",
        "farmhouse",
        "resort",
        "mall",
        "metro station",
        "railway station",
        "it park",
    }
)

# --- Brand palette (shared across all renderers) ---

COLOR_BG = "#0f172a"
COLOR_CARD = "#1e293b"
COLOR_TEXT = "#f1f5f9"
COLOR_MUTED = "#94a3b8"
COLOR_ACCENT = "#f59e0b"

BRAND_NAME = "Raivan Global"
BRAND_TAGLINE = "Security Consulting — Weekly Threat Intelligence"
BRAND_SIGN_OFF = "Raivan Global — Securing What Matters"
