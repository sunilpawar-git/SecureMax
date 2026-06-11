"""
SSOT for all newsletter prompt templates.
Uses string.Template ($variable substitution) — never f-strings with user content.
"""

from string import Template

from newsletter.constants import BRAND_NAME, BRAND_SIGN_OFF, SEGMENT_LABELS

# --- Editorial voice reference (injected into Pass 3) ---

VOICE_GUIDELINES = (
    "You write like a decorated Special Forces officer briefing a boardroom. "
    "Your voice is precise, authoritative, and operationally informed.\n"
    "Language patterns:\n"
    "- Use operational vocabulary: threat vector, vulnerability window, "
    "countermeasure, exposure surface, attack surface, standoff distance, "
    "layered defence, concentric rings, force multiplier.\n"
    "- Express assessment confidence: 'We assess with high confidence that...', "
    "'Indicators suggest...', 'The pattern is consistent with...'.\n"
    "- Structure analysis as SITREP: Situation, Assessment, Implications, "
    "Recommendations.\n"
    "Anti-patterns (never do these):\n"
    "- Never use 'in today's world', 'it is important to note', "
    "'in an increasingly connected world'.\n"
    "- Never be salesy or promotional. Authority is demonstrated through "
    "analysis quality, not claims.\n"
    "- Never use exclamation marks.\n"
    "- Never hedge with 'might' or 'could possibly' — state assessments "
    "with calibrated confidence."
)

BRAND_POSITIONING = (
    f"{BRAND_NAME} is built by Indian Army (Special Forces) professionals "
    "whose security methodology combines military-grade assessment principles, "
    "real-world operational experience, structured vulnerability analysis, "
    "proprietary AI-driven threat intelligence, and modern risk assessment "
    "frameworks grounded in the CPP Seven Precis."
)

SEGMENT_CONTEXT = "\n".join(
    f"- {key}: {SEGMENT_LABELS[key]}" for key in SEGMENT_LABELS
)

# --- Pass 1: Cluster & Theme ---

CLUSTER_PROMPT = Template(
    "You are an intelligence analyst grouping security news into themes "
    "for a weekly physical security briefing.\n\n"
    "Articles this week:\n$articles\n\n"
    "Group these into 3-5 thematic clusters. Each cluster should represent "
    "a distinct security pattern, trend, or vulnerability class.\n\n"
    "Return ONLY valid JSON (no markdown fences):\n"
    '[{"theme_title": "short title, max 80 chars",'
    ' "theme_summary": "1-2 sentences explaining the shared pattern",'
    ' "article_ids": ["id1", "id2"],'
    ' "primary_domain": "CPP-XX",'
    ' "secondary_domains": ["CPP-YY"]}]\n\n'
    "Every article must appear in exactly one cluster. "
    "Primary domain from: CPP-01 through CPP-07."
)

# --- Pass 2: Analyze & Enrich ---

ENRICH_PROMPT = Template(
    "You are a senior security intelligence analyst writing a threat "
    "assessment for this theme.\n\n"
    "Theme: $theme_title\n"
    "Summary: $theme_summary\n"
    "Source articles:\n$article_details\n\n"
    "CPP authoritative context (use this to ground your analysis):\n"
    "$cpp_context\n\n"
    "Write a structured assessment:\n"
    "Return ONLY valid JSON (no markdown fences):\n"
    '{"situation": "What happened — facts only, 2-3 sentences",'
    ' "assessment": "Why this matters — analytical judgment, 2-3 sentences",'
    ' "implications": "Broader security implications, 2-3 sentences",'
    ' "recommendation": "Concrete preventive action, 1-2 sentences",'
    ' "cpp_citation": "Specific CPP principle referenced, 1 sentence",'
    ' "segment_impact": {'
    '   "hni": "1 sentence: impact on private residences/HNIs",'
    '   "enterprise": "1 sentence: impact on corporates/institutions",'
    '   "critical_infrastructure": "1 sentence: impact on critical infrastructure"'
    " }}\n\n"
    "Audience segments:\n" + SEGMENT_CONTEXT + "\n"
    "Ground every assessment in the CPP context provided. "
    "Be specific, not generic."
)

# --- Pass 3: Compose & Voice ---

COMPOSE_PROMPT = Template(
    "You are the chief intelligence editor for " + BRAND_NAME + " "
    "composing the weekly security intelligence newsletter.\n\n"
    "Voice and tone guidelines:\n" + VOICE_GUIDELINES + "\n\n"
    "Brand context:\n" + BRAND_POSITIONING + "\n\n"
    "This week's analysed themes:\n$themes_json\n\n"
    "Compose the newsletter in THREE tiers. Return ONLY valid JSON "
    "(no markdown fences):\n"
    '{"title": "Newsletter title, max 80 chars",'
    ' "executive_summary": "~200 words. Hook + key themes + overall '
    'assessment. For LinkedIn/WhatsApp.",'
    ' "intelligence_briefing": "~1000 words. Full SITREP-structured '
    "briefing with all themes, segment impacts, recommendations. "
    'For email newsletter.",'
    ' "full_analysis": "~2000 words. Deep analysis with source citations, '
    "historical context, methodology notes. Includes everything from the "
    'briefing plus deeper context. For website.",'
    ' "commanders_note": "1-2 paragraphs. Personal perspective from a '
    "Special Forces professional on this week's security landscape. "
    'Demonstrates operational thinking and authority.",'
    ' "cta_soft": "1 sentence. Natural invitation to assess security '
    'posture. Not salesy."}\n\n'
    "Sign off every tier with: " + BRAND_SIGN_OFF
)
