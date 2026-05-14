# Phase 5: Unblocking & Implementation Roadmap

## 🔓 UNBLOCKING PHASE 5 (TODAY — 30 minutes)

### Step 1: Copy CPP PDFs to Project
```bash
mkdir -p "/Users/sunil/Downloads/Security Crawler/cpp-pdfs"

# Check that PDFs exist in source
ls "/Users/sunil/Library/Mobile Documents/com~apple~CloudDocs/CPP/Book/Concise Notes/"

# Copy to project
cp "/Users/sunil/Library/Mobile Documents/com~apple~CloudDocs/CPP/Book/Concise Notes"/*.pdf \
   "/Users/sunil/Downloads/Security Crawler/cpp-pdfs/"

# Verify
ls -lah "/Users/sunil/Downloads/Security Crawler/cpp-pdfs/"
# Should show:
# 01 PHYSICAL SECURITY.pdf
# 02 BUSINESS PRINCIPLES.pdf
# ... etc (all 7 PDFs)
```

### Step 2: Activate Python Environment
```bash
cd "/Users/sunil/Downloads/Security Crawler/ai-service"

# If using venv
python -m venv .venv
source .venv/bin/activate

# Install/upgrade dependencies
pip install -r requirements.txt
```

### Step 3: Run Embedding Seed Script
```bash
cd "/Users/sunil/Downloads/Security Crawler/ai-service"
python scripts/seed_cpp_embeddings.py

# Expected output:
# Processing CPP-01: PHYSICAL SECURITY.pdf
#   Parsing... OK
#   Chunking (400 tokens, 50-token overlap)... 187 chunks
#   Embedding via Gemini text-embedding-004 (768 dims)... OK
#   Inserting into cpp_chunks... OK
# 
# Processing CPP-02: BUSINESS PRINCIPLES.pdf
#   ... (similar)
# 
# ... (all 7 CPPs)
# 
# SUMMARY:
# Total chunks embedded: 1,387
# Total tokens processed: ~554,800
# Embeddings cost (free tier): $0.00
# Time elapsed: 2-3 minutes
# Database: cpp_chunks table populated ✅
```

### Step 4: Verify Embeddings in Database
```bash
# Option A: Using Prisma Studio (GUI)
npx prisma studio
# Navigate to cpp_chunks table, verify ~1,400 rows

# Option B: Using psql directly
psql postgresql://postgres:postgres@localhost:5432/raivan_global

\c raivan_global
SELECT COUNT(*) FROM cpp_chunks;  -- Should show ~1,400
SELECT domain, COUNT(*) FROM cpp_chunks GROUP BY domain;  -- Breakdown by CPP domain

-- Sample embeddings check
SELECT id, domain, section, chunk_text::text LIMIT 1;
```

### Step 5: Test pgvector Search
```bash
# Start FastAPI server
cd "/Users/sunil/Downloads/Security Crawler/ai-service"
uvicorn main:app --reload --port 8000

# In another terminal, test search
curl -X POST http://localhost:8000/ai/search-chunks \
  -H "Content-Type: application/json" \
  -d '{"query": "gate access code shared delivery personnel", "k": 3}' \
  -s | jq .

# Expected output:
# {
#   "chunks": [
#     {
#       "domain": "CPP-01",
#       "section": "Principle 4: Deny",
#       "text": "Single points of failure in access control create vulnerabilities...",
#       "similarity_score": 0.87
#     },
#     ...
#   ]
# }
```

**✅ If you reach here, Phase 3 is complete. Phase 4 and 5 can now proceed.**

---

## 🎯 PHASE 5 CRITICAL IMPLEMENTATIONS

### Implementation 1: Gemini Narrative Augmentation (3 hours)

**File:** `ai-service/report/generator.py`

**Current state:**
```python
def _generate_recommendation(event: dict, severity: str) -> str:
    """Generate a placeholder recommendation. AI-augmented in production."""
    domain = event.get("domain", "")
    if severity == SEVERITY_CRITICAL:
        return f"IMMEDIATE ACTION REQUIRED: Address {domain} gap identified."
    # ... placeholder logic
```

**Target state:**
```python
from google import genai
from config import get_settings

async def augment_findings_with_gemini(findings: list[dict], track: str, session: dict) -> dict:
    """
    Enhance findings with:
    1. Executive summary narrative (3-4 paragraphs)
    2. For enterprise: Board-level risk language (liability, insurance, compliance)
    3. Threat intel context
    """
    settings = get_settings()
    client = genai.Client(api_key=settings.gemini_api_key)
    
    # 1. Generate narrative
    narrative = await _generate_narrative(client, findings, track)
    
    # 2. If enterprise, generate board summary
    board_summary = None
    if track == TRACK_ENTERPRISE:
        board_summary = await _generate_board_summary(client, findings)
    
    # 3. Enhance each finding with recommendation
    enhanced_findings = []
    for f in findings:
        recommendation = await _generate_detailed_recommendation(client, f, track)
        enhanced_findings.append({
            **f,
            "recommendation": recommendation,
            "requires_physical_verification": f["severity"] in ["critical", "high"]
        })
    
    return {
        "narrative": narrative,
        "board_summary": board_summary,
        "enhanced_findings": enhanced_findings
    }

async def _generate_narrative(client, findings: list[dict], track: str) -> str:
    """Generate 3-4 paragraph executive summary."""
    critical_count = sum(1 for f in findings if f["severity"] == "critical")
    high_count = sum(1 for f in findings if f["severity"] == "high")
    
    prompt = f"""You are a security audit specialist. Generate a compelling 3-4 paragraph 
    executive summary for a {track} property owner based on these audit findings.
    
    Critical issues found: {critical_count}
    High priority issues: {high_count}
    
    Findings summary:
    {json.dumps(findings[:10], indent=2)}  # Top 10 findings by severity
    
    Requirements for {track} audience:
    {"- Focus on: liability exposure, insurance implications, regulatory risk" if track == "enterprise" else "- Focus on: personal safety, family security, practical improvements"}
    - Be direct and actionable
    - Include specific timeline for remediation (e.g., "address critical issues within 30 days")
    - Reference CPP Seven Precis framework (but explain in accessible terms)
    
    Return only the narrative, no headers or meta-commentary."""
    
    response = await client.models.generate_content_async(
        model="gemini-2.5-pro",
        contents=prompt
    )
    return response.text

async def _generate_board_summary(client, findings: list[dict]) -> str:
    """Generate board-level risk summary (enterprise only)."""
    prompt = f"""Translate these security audit findings into board-level risk language.
    
    Findings:
    {json.dumps(findings[:15], indent=2)}
    
    Address:
    1. Liability exposure: What legal/financial risk does each category create?
    2. Insurance implications: Could gaps affect policy coverage?
    3. Regulatory risk: What compliance violations could result?
    4. Stakeholder impact: How would incidents affect operations/reputation?
    
    Format: 2-3 paragraphs in business language, not security jargon.
    Target audience: CFO, General Counsel, COO."""
    
    response = await client.models.generate_content_async(
        model="gemini-2.5-pro",
        contents=prompt
    )
    return response.text

async def _generate_detailed_recommendation(client, finding: dict, track: str) -> str:
    """Generate specific, actionable recommendation per finding."""
    prompt = f"""Given this security audit finding, provide a specific, actionable recommendation.
    
    Domain: {finding.get('domain')}
    Severity: {finding.get('severity')}
    Question asked: {finding.get('question_text')}
    User answer: {finding.get('answer')}
    
    Recommendation should:
    1. Be specific (not generic)
    2. Include estimated cost/effort level (low/medium/high)
    3. Reference CPP framework if applicable
    4. Suggest timeline (immediate/30-60 days/ongoing)
    
    For {track} audience: {"keep practical and clear for property owner" if track == "hni" else "use formal business language"}
    
    Limit to 2-3 sentences."""
    
    response = await client.models.generate_content_async(
        model="gemini-2.5-pro",
        contents=prompt
    )
    return response.text
```

**Integration point:** Modify `generate_report_data()` in `generator.py`:
```python
def generate_report_data(session: dict) -> dict:
    """Main entry point: session → complete report data structure."""
    events = session.get("events", [])
    track = session.get("track", TRACK_HNI)

    radar_scores = compute_radar_scores(events)
    findings = generate_findings(events)
    
    # NEW: Augment with Gemini
    augmented = await augment_findings_with_gemini(findings, track, session)
    
    urgency = compute_urgency_score(findings)
    benchmark = compute_peer_benchmark(urgency)
    free_findings, paid_findings = split_free_paid(findings)
    compliance_gaps = _count_compliance_gaps(findings)
    
    # Use augmented findings in report
    if track == TRACK_ENTERPRISE:
        return _build_enterprise_report(..., augmented["enhanced_findings"], augmented["board_summary"], ...)
    return _build_hni_report(..., augmented["enhanced_findings"], augmented["narrative"], ...)
```

**Tests needed:**
```python
# tests/test_report_gemini.py
@pytest.mark.asyncio
async def test_narrative_generation_for_hni():
    findings = [
        {"domain": "CPP-01", "severity": "critical", "question_text": "Gate code?", "answer": "Shared"},
        {"domain": "CPP-06", "severity": "high", "question_text": "Background checks?", "answer": "None"},
    ]
    narrative = await _generate_narrative(mock_client, findings, "hni")
    assert "physical security" in narrative.lower()
    assert len(narrative) > 200  # Substantial narrative

@pytest.mark.asyncio
async def test_board_summary_for_enterprise():
    findings = [...]
    summary = await _generate_board_summary(mock_client, findings)
    assert "liability" in summary.lower() or "insurance" in summary.lower()
```

---

### Implementation 2: HTML→PDF Rendering via Playwright (5 hours)

**New file:** `ai-service/report/pdf_renderer.py`

```python
"""
Convert structured report data to pixel-perfect PDF via Playwright.
HTML template rendered with Tailwind CSS → chromium → PDF bytes.
"""

import asyncio
import json
from typing import Optional

from playwright.async_api import async_playwright
from jinja2 import Template

from config import TRACK_HNI, TRACK_ENTERPRISE


async def render_report_to_pdf(
    report_data: dict,
    track: str,
    white_label: dict = None,  # {"org_name": "Raivan Global", "logo_url": "..."}
) -> bytes:
    """
    Main entry: report data structure → PDF bytes (encrypted at caller).
    
    Args:
        report_data: Output from generate_report_data()
        track: "hni" or "enterprise"
        white_label: Optional org branding
    
    Returns:
        PDF bytes (BYTEA ready for postgres)
    """
    if white_label is None:
        white_label = {"org_name": "Raivan Global", "logo_url": None}
    
    # 1. Build HTML from template
    html = await _build_html_report(report_data, track, white_label)
    
    # 2. Playwright: render → PDF
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1200, "height": 1600})
        
        try:
            # Set content and wait for fonts/images to load
            await page.set_content(html, wait_until="networkidle")
            
            # Add page numbers (CSS hack: counter-increment in footer)
            await page.evaluate("""
                () => {
                    // Rendered via Playwright; page layout already applied
                    console.log('Page rendered');
                }
            """)
            
            # Export to PDF
            pdf_bytes = await page.pdf(
                format="A4",
                margin={
                    "top": "0.5in",
                    "right": "0.5in",
                    "bottom": "0.5in",
                    "left": "0.5in",
                },
                print_background=True,
                prefer_css_page_size=True,
            )
        finally:
            await browser.close()
    
    return pdf_bytes


async def _build_html_report(
    report_data: dict,
    track: str,
    white_label: dict,
) -> str:
    """
    Render report data into HTML/Tailwind template.
    """
    template_str = _get_report_template(track)
    template = Template(template_str)
    
    # Prepare context for template
    context = {
        "track": track,
        "white_label": white_label,
        "report": report_data,
        "cpp_domains": {
            "CPP-01": "Physical Security",
            "CPP-02": "Business Principles",
            "CPP-03": "Crisis Management",
            "CPP-04": "Investigations",
            "CPP-05": "Information Security",
            "CPP-06": "Personnel Security",
            "CPP-07": "Security Management",
        },
    }
    
    html = template.render(**context)
    return html


def _get_report_template(track: str) -> str:
    """
    Return Tailwind/HTML template for HNI or Enterprise report.
    This would be a large Jinja2 template string (see template below).
    """
    if track == TRACK_ENTERPRISE:
        return _enterprise_report_template()
    return _hni_report_template()


def _hni_report_template() -> str:
    """
    HNI report: 8 sections with radar chart, findings, action roadmap.
    """
    return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        @page {
            size: A4;
            margin: 0.5in;
            @bottom-center { content: "Page " counter(page) " of " counter(pages); }
        }
        
        .page-break { page-break-after: always; margin: 0; }
        
        /* Cover page */
        .cover {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .cover h1 { font-size: 48px; margin-bottom: 20px; }
        .cover .meta { font-size: 14px; opacity: 0.9; margin-top: 40px; }
        
        /* Section headers */
        .section-header {
            font-size: 28px;
            font-weight: 700;
            margin-top: 60px;
            margin-bottom: 30px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
        }
        
        /* Urgency score hero */
        .urgency-hero {
            background: #fff3cd;
            border-left: 5px solid #ff6b6b;
            padding: 30px;
            margin: 30px 0;
            border-radius: 8px;
        }
        .urgency-score {
            font-size: 56px;
            font-weight: 700;
            color: #ff6b6b;
        }
        .urgency-label {
            font-size: 18px;
            color: #666;
            margin-top: 10px;
        }
        
        /* Radar chart (SVG embedded) */
        .radar-section {
            margin: 40px 0;
            text-align: center;
        }
        .radar-chart {
            width: 400px;
            height: 400px;
            margin: 0 auto;
        }
        
        /* Findings table */
        .findings-table {
            width: 100%;
            margin: 30px 0;
            border-collapse: collapse;
        }
        .findings-table th {
            background: #667eea;
            color: white;
            padding: 12px;
            text-align: left;
        }
        .findings-table td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
        }
        .findings-table tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        /* Severity badges */
        .severity-critical { color: #ff6b6b; font-weight: 700; }
        .severity-high { color: #ffa500; font-weight: 600; }
        .severity-medium { color: #ffd93d; font-weight: 600; }
        .severity-low { color: #6bcf7f; }
        
        /* Recommendation cards */
        .recommendation {
            background: #f0f4ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
        }
        .recommendation-title {
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        /* Footer */
        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #999;
        }
    </style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover page-break">
    <img src="{{ white_label.logo_url or 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E' }}" style="width: 120px; margin-bottom: 40px;">
    <h1>Security Audit Report</h1>
    <p style="font-size: 18px; margin-top: 20px;">{{ report.sections.executive_summary.urgency_score | default('Comprehensive') }} Assessment</p>
    <div class="meta">
        <p>Generated by {{ white_label.org_name }}</p>
        <p>{{ report.session_id }}</p>
    </div>
</div>

<!-- SECTION 1: URGENCY SCORE -->
<div class="page-break">
    <h2 class="section-header">1. Audit Urgency & Risk Summary</h2>
    <div class="urgency-hero">
        <div class="urgency-score">{{ report.sections.executive_summary.urgency_score }}/100</div>
        <div class="urgency-label">
            {% if report.sections.executive_summary.urgency_score >= 70 %}
            HIGH RISK — Immediate attention required
            {% elif report.sections.executive_summary.urgency_score >= 40 %}
            MODERATE RISK — Address within 60 days
            {% else %}
            LOW RISK — Review and enhance ongoing
            {% endif %}
        </div>
    </div>
    <p><strong>Critical Findings:</strong> {{ report.sections.executive_summary.critical_count }}</p>
    <p><strong>Domains Assessed:</strong> {{ report.sections.executive_summary.domains_assessed | join(', ') }}</p>
</div>

<!-- SECTION 2: EXECUTIVE SUMMARY -->
<div class="page-break">
    <h2 class="section-header">2. Executive Summary</h2>
    {{ report.narrative or 'Audit completed. Review findings below.' }}
</div>

<!-- SECTION 3: RADAR CHART -->
<div class="page-break">
    <h2 class="section-header">3. CPP Domain Assessment</h2>
    <div class="radar-section">
        <svg class="radar-chart" viewBox="0 0 400 400">
            <!-- Radar chart SVG generated from report.sections.radar_scores -->
            <!-- This would be generated dynamically based on scores -->
        </svg>
    </div>
    <table class="findings-table" style="margin-top: 40px;">
        <thead>
            <tr>
                <th>Domain</th>
                <th>CPP Reference</th>
                <th>Score</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            {% for domain, score in report.sections.radar_scores.items() %}
            <tr>
                <td>{{ domain }}</td>
                <td>{{ cpp_domains[domain] }}</td>
                <td>{{ score }}%</td>
                <td>
                    {% if score >= 70 %}
                    ✓ Acceptable
                    {% elif score >= 40 %}
                    ⚠ Needs Improvement
                    {% else %}
                    ✗ Critical
                    {% endif %}
                </td>
            </tr>
            {% endfor %}
        </tbody>
    </table>
</div>

<!-- SECTION 4-5: FINDINGS -->
<div class="page-break">
    <h2 class="section-header">4. Security Findings (by Severity)</h2>
    {% for severity in ['critical', 'high', 'medium', 'low'] %}
        {% set findings = report.sections.findings_by_severity[severity] or [] %}
        {% if findings %}
        <h3 style="margin-top: 30px; color: 
            {% if severity == 'critical' %}#ff6b6b
            {% elif severity == 'high' %}#ffa500
            {% else %}#666{% endif %}">
            {{ severity | upper }} ({{ findings | length }})
        </h3>
        {% for f in findings %}
        <div class="recommendation">
            <div class="recommendation-title">{{ f.question }}</div>
            <p><strong>Your answer:</strong> {{ f.answer }}</p>
            <p><strong>Finding:</strong> {{ f.finding or 'Security gap identified' }}</p>
            <p><strong>CPP Domain:</strong> {{ f.domain_name }}</p>
        </div>
        {% endfor %}
        {% endif %}
    {% endfor %}
</div>

<!-- SECTION 6: ACTION ROADMAP -->
<div class="page-break">
    <h2 class="section-header">5. Recommended Action Roadmap</h2>
    <h3 style="color: #ff6b6b; margin-top: 20px;">Immediate (Next 30 Days)</h3>
    {% for rec in report.sections.recommendations | slice(0, 5) %}
    <div class="recommendation">{{ rec }}</div>
    {% endfor %}
    
    <h3 style="color: #ffa500; margin-top: 30px;">Short Term (30-60 Days)</h3>
    {% for rec in report.sections.recommendations | slice(5, 10) %}
    <div class="recommendation">{{ rec }}</div>
    {% endfor %}
</div>

<!-- SECTION 7: ABOUT & CTA -->
<div class="page-break">
    <h2 class="section-header">6. About This Assessment</h2>
    <p>This report is based on the <strong>CPP Seven Precis</strong>, a comprehensive security framework used by leading consultancies worldwide.</p>
    <p style="margin-top: 20px;"><strong>Next Steps:</strong></p>
    <ul style="margin-left: 20px;">
        <li>Review findings with household decision-makers</li>
        <li>Prioritize by severity and impact</li>
        <li>Contact {{ white_label.org_name }} for on-site physical audit consultation</li>
    </ul>
</div>

<!-- FOOTER -->
<div class="footer">
    <p>{{ white_label.org_name }} | Confidential Security Assessment</p>
    <p>This report is for your personal use only. Do not share without written permission.</p>
</div>

</body>
</html>
"""


def _enterprise_report_template() -> str:
    """Similar to HNI, with additions for board language + compliance appendix."""
    # Similar structure, with additional sections for:
    # - Compliance Mapping Appendix
    # - Board Risk Summary
    # - Annual Re-Audit Recommendation
    pass
```

**Integration into report pipeline:**

```python
# ai-service/routers/report.py

from report.pdf_renderer import render_report_to_pdf

@router.post("/generate", response_model=GenerateReportResponse)
async def generate_report(
    req: GenerateReportRequest,
    x_user_id: str | None = Header(None),
    conn: asyncpg.Connection = Depends(get_db),
) -> GenerateReportResponse:
    # ... existing session checks ...
    
    # Get report data
    raw_events = await repo.get_session_events(conn, req.session_id, _enc_key)
    report_events = _build_report_events(raw_events, node_map)
    report_data = generate_report_data({**session, "events": report_events})
    
    # NEW: Render to PDF
    user_profile = await repo.get_user(conn, session["user_id"])
    white_label = {
        "org_name": user_profile.get("org_name", "Raivan Global"),
        "logo_url": user_profile.get("logo_url"),
    }
    pdf_bytes = await render_report_to_pdf(report_data, session["track"], white_label)
    
    # NEW: Encrypt and store
    pdf_encrypted = encrypt(pdf_bytes, _enc_key)
    await repo.create_report_artifact(
        conn,
        session_id=req.session_id,
        pdf_encrypted=pdf_encrypted,
        urgency_score=report_data["sections"]["executive_summary"]["urgency_score"],
        compliance_gap_count=report_data["sections"].get("compliance_gaps", 0),
    )
    
    # Return success
    report_id = str(uuid.uuid4())
    _report_store[report_id] = {
        "session_id": req.session_id,
        "status": "completed",
    }
    return GenerateReportResponse(report_id=report_id, status="completed")
```

**Tests:**
```python
# tests/test_pdf_rendering.py

@pytest.mark.asyncio
async def test_render_hni_report_to_pdf():
    report_data = {
        "type": "hni",
        "sections": {
            "executive_summary": {"urgency_score": 68, "critical_count": 3},
            "radar_scores": {"CPP-01": 85, "CPP-02": 90, ...},
            ...
        }
    }
    pdf_bytes = await render_report_to_pdf(report_data, "hni")
    assert pdf_bytes.startswith(b"%PDF")  # Valid PDF magic number
    assert len(pdf_bytes) > 50000  # Substantial document

@pytest.mark.asyncio
async def test_render_enterprise_report_to_pdf():
    # Similar, with compliance appendix checks
    pass
```

---

### Implementation 3: Compliance Appendix Generation (3 hours)

**New file:** `ai-service/report/compliance.py`

```python
"""
Generate ISO 27001 + PSARA compliance mappings for enterprise reports.
Each finding → CPP domain → ISO 27001 clause → PSARA section.
"""

import json
from google import genai
from config import get_settings, TRACK_ENTERPRISE


async def generate_compliance_appendix(findings: list[dict], track: str) -> list[dict]:
    """
    For enterprise track only: enrich findings with compliance mappings.
    
    Returns:
        List of {finding_id, finding_title, cpp_domain, iso_clause, psara_section, severity, owner_role}
    """
    if track != TRACK_ENTERPRISE:
        return []
    
    settings = get_settings()
    client = genai.Client(api_key=settings.gemini_api_key)
    
    appendix = []
    for f in findings:
        mapping = await _map_finding_to_compliance(client, f)
        appendix.append({
            "finding_id": f.get("id", str(len(appendix))),
            "finding_title": f.get("question", ""),
            "cpp_domain": f.get("domain", ""),
            "severity": f.get("severity", "medium"),
            **mapping,
        })
    
    return appendix


async def _map_finding_to_compliance(client, finding: dict) -> dict:
    """
    Gemini Pro: finding → ISO 27001 + PSARA clauses.
    """
    prompt = f"""You are a compliance expert. Map this security finding to relevant standards.
    
    Finding:
    - Domain: {finding.get('domain')}
    - Severity: {finding.get('severity')}
    - Issue: {finding.get('question')}: {finding.get('answer')}
    
    Identify:
    1. ISO 27001 Annex A.11 clause (Physical and Environmental Security), e.g., "A.11.1.1" or "N/A"
    2. PSARA (Physical Security Requirements for Arms) section if applicable, e.g., "Section 5.2" or "N/A"
    3. Remediation owner role in enterprise (e.g., "Security Manager", "Facility Manager", "IT Lead")
    
    Return JSON:
    {{
        "iso_clause": "A.11.1.1",
        "iso_description": "Short description of the clause",
        "psara_section": "Section 5.2 or N/A",
        "psara_description": "Short description",
        "remediation_owner_role": "Role responsible for fixing (e.g., 'Facility Manager')",
        "timeline": "Immediate / 30 days / 60 days"
    }}
    
    Be concise. Return only valid JSON."""
    
    try:
        response = await client.models.generate_content_async(
            model="gemini-2.5-pro",
            contents=prompt
        )
        result = json.loads(response.text)
        return result
    except Exception as e:
        # Graceful fallback
        return {
            "iso_clause": "A.11.1",
            "iso_description": "Physical and Environmental Security",
            "psara_section": "N/A",
            "psara_description": "Not applicable",
            "remediation_owner_role": "Security Manager",
            "timeline": "30 days",
        }
```

**Integration:**
```python
# In ai-service/report/generator.py

from report.compliance import generate_compliance_appendix

def _build_enterprise_report(...) -> dict:
    """Build enterprise 10-section report."""
    
    # ... existing sections 1-8 ...
    
    # NEW: Section 9 — Compliance Appendix
    compliance_appendix = await generate_compliance_appendix(findings, TRACK_ENTERPRISE)
    
    # NEW: Section 10 — Annual Re-Audit
    re_audit_rec = {
        "baseline_score": urgency,
        "recommended_cadence": "Annual",
        "urgent_triggers": [
            "New facility or major facility expansion",
            "Security incident or breach",
            "Change in vendor/contractor relationships",
            "Regulatory change or audit finding",
        ]
    }
    
    return {
        ...existing_sections...,
        "compliance_appendix": compliance_appendix,
        "re_audit_recommendation": re_audit_rec,
    }
```

---

## 📅 Implementation Timeline

| Task | Estimate | Dependency | Status |
|------|----------|------------|--------|
| Seed CPP embeddings | 30 min | None | **Start Here** |
| Gemini narrative augmentation | 3 hours | Embeddings ✅ | Follow immediately |
| HTML→PDF rendering | 5 hours | Narrative ready | Follow immediately |
| Compliance appendix | 3 hours | PDF rendering | Parallel OK |
| Threat intel linking | 2 hours | PDF rendering | Parallel OK |
| SSE polling | 2 hours | Report generation | Last |
| E2E testing | 2 hours | All above | Last |

**Critical path:** Embeddings → Narrative → PDF rendering = 8.5 hours

After embeddings are seeded, proceed in parallel on narrative + PDF rendering. Start them today.

---

## 🎯 Next Steps

**Immediately:**
1. Run the 30-minute CPP embedding seed (copy PDFs + run script)
2. Verify embeddings in Prisma Studio / psql
3. Test pgvector search with a sample query

**Within 2 hours:**
1. Start implementing Gemini narrative augmentation
2. Begin HTML template for PDF rendering

**By end of day:**
- Embeddings ✅
- Narrative augmentation ✅
- PDF rendering proof-of-concept ✅

This puts Phase 5 at **75-80% complete by EOD**, with final polish and testing the next day.
