"""
SSOT for answer classification keywords.
Used by both scoring.py (radar) and report/findings.py (severity).
"""

NEGATIVE_KEYWORDS: set[str] = {
    "no",
    "never",
    "not logged",
    "no plan exists",
    "neither",
    "unsure",
    "only after incidents",
    "yes — default settings",
    "yes — unescorted",
    "yes — all staff",
    "no checklist",
    "informal checks only",
    "yes — unrestricted",
    "no — significant dark zones",
    "no — same network",
    "not lit",
    "no access control",
    "informal fixes",
    "no follow-up",
    "verbal reporting only",
    "no recurring schedule",
    "no one specifically",
    "informal role",
    "no formal cycle",
    "informal only",
    "no — property empty",
}

MODERATE_KEYWORDS: set[str] = {
    "partially lit",
    "some blind spots",
    "yes — some blind spots",
    "yes — unsure about coverage",
    "sometimes",
    "1-3 years ago",
    "documented but not rehearsed",
    "some members",
    "for some roles only",
    "partially",
    "6-12 months ago",
    "keycard only",
    "informal handover",
    "yes — informal role",
    "paper log",
}
