"""Phase 4B/4C tests — Email HTML, WhatsApp text, and website HTML renderers."""

from newsletter.constants import BRAND_NAME, BRAND_SIGN_OFF
from newsletter.models import EnrichedTheme, NewsletterContent, SegmentImpact
from newsletter.render_email import render_email_html
from newsletter.render_website import render_website_html
from newsletter.render_whatsapp import render_whatsapp_text


def _make_content(n_themes: int = 2) -> NewsletterContent:
    themes = [
        EnrichedTheme(
            theme_title=f"Theme {i}",
            situation=f"Situation {i}",
            assessment=f"Assessment {i}",
            implications=f"Implications {i}",
            recommendation=f"Recommendation {i}",
            cpp_domain=f"CPP-0{i}",
            cpp_citation=f"CPP-0{i} §3.{i}",
            segment_impact=SegmentImpact(
                hni=f"HNI impact {i}",
                enterprise=f"Enterprise impact {i}",
                critical_infrastructure=f"CI impact {i}",
            ),
            source_article_ids=[f"a{i}"],
        )
        for i in range(1, n_themes + 1)
    ]
    return NewsletterContent(
        title="Test Security Digest",
        issue_date="11 June 2026",
        executive_summary="This week saw multiple incidents.",
        intelligence_briefing="Full briefing here.",
        full_analysis="Deep analysis content.",
        commanders_note="From the field...",
        cta_soft="Assess your security posture.",
        cta_audit_link="/security-audit",
        themes=themes,
    )


class TestEmailHtml:
    def test_contains_brand_name(self) -> None:
        html = render_email_html(_make_content())
        assert BRAND_NAME in html

    def test_contains_title(self) -> None:
        html = render_email_html(_make_content())
        assert "Test Security Digest" in html

    def test_contains_all_themes(self) -> None:
        content = _make_content(3)
        html = render_email_html(content)
        for t in content.themes:
            assert t.theme_title in html

    def test_contains_segment_impact(self) -> None:
        html = render_email_html(_make_content())
        assert "HNI impact 1" in html
        assert "Enterprise impact 1" in html

    def test_contains_cta(self) -> None:
        html = render_email_html(_make_content())
        assert "security-audit" in html
        assert "Start Your Security Assessment" in html

    def test_contains_commanders_note(self) -> None:
        html = render_email_html(_make_content())
        assert "From the field..." in html

    def test_escapes_html_in_titles(self) -> None:
        content = _make_content(1)
        content.title = '<script>alert("x")</script>'
        html = render_email_html(content)
        assert "<script>" not in html
        assert "&lt;script&gt;" in html

    def test_contains_sign_off(self) -> None:
        html = render_email_html(_make_content())
        assert BRAND_SIGN_OFF in html

    def test_contains_issue_date(self) -> None:
        html = render_email_html(_make_content())
        assert "11 June 2026" in html


class TestWhatsAppText:
    def test_contains_brand(self) -> None:
        text = render_whatsapp_text(_make_content())
        assert BRAND_NAME in text

    def test_contains_themes(self) -> None:
        text = render_whatsapp_text(_make_content())
        assert "Theme 1" in text
        assert "Theme 2" in text

    def test_uses_whatsapp_formatting(self) -> None:
        text = render_whatsapp_text(_make_content())
        assert "*" in text  # bold markers
        assert "_" in text  # italic markers

    def test_contains_executive_summary(self) -> None:
        text = render_whatsapp_text(_make_content())
        assert "multiple incidents" in text

    def test_contains_cta(self) -> None:
        text = render_whatsapp_text(_make_content())
        assert "security posture" in text

    def test_contains_sign_off(self) -> None:
        text = render_whatsapp_text(_make_content())
        assert BRAND_SIGN_OFF in text

    def test_limits_themes_to_three(self) -> None:
        text = render_whatsapp_text(_make_content(5))
        assert "Theme 4" not in text


class TestWebsiteHtml:
    def test_uses_semantic_html(self) -> None:
        html = render_website_html(_make_content())
        assert "<article" in html
        assert "<section" in html
        assert "<header>" in html
        assert "<footer>" in html

    def test_contains_brand(self) -> None:
        html = render_website_html(_make_content())
        assert BRAND_NAME in html

    def test_contains_all_themes(self) -> None:
        content = _make_content(3)
        html = render_website_html(content)
        for t in content.themes:
            assert t.theme_title in html
            assert t.cpp_domain in html

    def test_contains_sitrep_structure(self) -> None:
        html = render_website_html(_make_content())
        assert "Situation:" in html
        assert "Assessment:" in html
        assert "Implications:" in html
        assert "Recommendation:" in html

    def test_contains_segment_impact(self) -> None:
        html = render_website_html(_make_content())
        assert "HNI impact 1" in html
        assert "Enterprise impact 1" in html
        assert "CI impact 1" in html

    def test_contains_cpp_citation(self) -> None:
        html = render_website_html(_make_content())
        assert "CPP-01 §3.1" in html

    def test_contains_commanders_note(self) -> None:
        html = render_website_html(_make_content())
        assert "From the field..." in html

    def test_escapes_untrusted_content(self) -> None:
        content = _make_content(1)
        content.themes[0].theme_title = '<img src=x onerror="alert(1)">'
        result = render_website_html(content)
        assert "<img src=x" not in result
        assert "&lt;img" in result

    def test_contains_data_domain_attribute(self) -> None:
        html = render_website_html(_make_content())
        assert 'data-domain="CPP-01"' in html
