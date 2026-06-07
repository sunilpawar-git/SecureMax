# CLAUDE.md — `ai-service/report/`

Report generation pipeline: findings → enrichment → narrative → compliance → rendering → encryption.

## Pipeline Sequence

1. **`findings.py`** — Extract findings from audit events; classify severity; split free vs paid tiers
2. **`enrichment.py`** — Attach CPP chunk excerpts (pgvector) + threat intel domain tags
3. **`narrative.py`** — AI-generated executive summary, board summary, per-finding recommendations
4. **`compliance.py`** — Map findings to ISO 27001 Annex A.11 + PSARA clauses
5. **`renderer.py`** — Jinja2 HTML template → Playwright headless → PDF bytes
6. **`background.py`** — `BackgroundTask` wrapper; encrypt PDF via `crypto.py`; store in `ReportArtifact`

## Rules

- **`findings.py`, `scoring.py` are pure functions** — no I/O; keep them that way
- **All Gemini prompts are `string.Template` in `prompts.py`** — never use f-strings (S4 injection risk)
- **Every Gemini call has deterministic fallback** — never let Gemini failure break report generation
- **HNI = 8 sections, Enterprise = 10 sections** — constants in `constants.py`; do not hardcode
- **`split_free_paid()`** — top 3 findings free-tier; rest payment-gated — never change this silently
- **PDF bytes AES-encrypted** via `crypto.py` before storage in `ReportArtifact.pdfEncrypted`
- **Templates are Jinja2** in `templates/` — rendered to HTML, then Playwright headless → PDF bytes

## Prompt Pattern (Injection Safe)

```python
# ✓ Correct: string.Template
from string import Template
FINDING_PROMPT = Template("""
Analyze this finding:
$finding_text

Risk context:
$context

Provide a concise recommendation.
""")

prompt = FINDING_PROMPT.substitute(
  finding_text=finding.text,
  context=context_str
)

# ✗ Wrong: f-strings
prompt = f"""
Analyze: {finding.text}
User context: {user_input}  # Injection vector!
"""
```

## Common Pitfalls

1. Using f-strings in prompts → S4 injection risk (use `string.Template` instead)
2. Letting Gemini failures break the report → no fallback logic
3. Hardcoding section names → inconsistency when report structure changes
4. Merging free/paid logic with findings → hard to test, audit
5. Storing plaintext PDFs → compliance violation
6. Blocking HTTP response for PDF generation → timeout risk (use `BackgroundTask`)
