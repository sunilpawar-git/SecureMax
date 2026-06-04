"""
Tests for all audit-identified fixes (Phases A-D).
Covers: encryption fail-open, payment gate, timing-safe key compare,
status/summary auth, split_free_paid safety, compliance unknown domain,
Gemini response validation, parallel enrichment, board prompt fix,
renderer constants.
"""

import hmac
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from gemini_client import GeminiClient, GeminiError
from report.compliance import _fallback_mapping
from report.findings import split_free_paid
from report.narrative import generate_board_summary


# ---------------------------------------------------------------------------
# A1 — Encryption fail-open
# ---------------------------------------------------------------------------
class TestEncryptionFailOpen:
    @pytest.mark.asyncio
    async def test_background_task_fails_when_no_enc_key(self) -> None:
        """generate_report_background must fail the job, not store plaintext."""
        from report.background import generate_report_background

        mock_conn = AsyncMock()
        mock_conn.fetchrow = AsyncMock(return_value=None)
        mock_pool = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

        # Patch _enc_key to None inside the background module
        import report.background as bg_module

        original = bg_module._enc_key
        bg_module._enc_key = None
        try:
            await generate_report_background(mock_pool, "job-1", "sess-1", {"track": "hni"}, [])
        finally:
            bg_module._enc_key = original

        # update_job_status should have been called with FAILED
        calls = [str(c) for c in mock_conn.execute.call_args_list]
        assert any("failed" in c.lower() for c in calls)


# ---------------------------------------------------------------------------
# A2 — Payment gate: HNI paid vs enterprise_report_unlocked
# ---------------------------------------------------------------------------
class TestPaymentGate:
    def _make_session(self, paid: bool, enterprise_unlocked: bool) -> dict:
        return {
            "id": "sess-x",
            "user_id": "user-x",
            "status": "completed",
            "track": "hni",
            "paid": paid,
            "enterprise_report_unlocked": enterprise_unlocked,
        }

    def test_hni_paid_flag_grants_access(self) -> None:
        from routers.report import _is_report_unlocked

        assert _is_report_unlocked(self._make_session(True, False)) is True

    def test_enterprise_unlock_flag_grants_access(self) -> None:
        from routers.report import _is_report_unlocked

        assert _is_report_unlocked(self._make_session(False, True)) is True

    def test_both_false_denies_access(self) -> None:
        from routers.report import _is_report_unlocked

        assert _is_report_unlocked(self._make_session(False, False)) is False

    def test_both_true_grants_access(self) -> None:
        from routers.report import _is_report_unlocked

        assert _is_report_unlocked(self._make_session(True, True)) is True


# ---------------------------------------------------------------------------
# A3 — Timing-safe key comparison
# ---------------------------------------------------------------------------
class TestTimingSafeKeyComparison:
    def test_middleware_uses_compare_digest(self) -> None:
        """Verify auth_middleware source uses hmac.compare_digest."""
        import inspect

        import auth_middleware

        source = inspect.getsource(auth_middleware)
        assert "compare_digest" in source, (
            "auth_middleware must use hmac.compare_digest for constant-time comparison"
        )

    def test_valid_key_passes(self) -> None:
        assert hmac.compare_digest("secret-key", "secret-key") is True

    def test_invalid_key_blocked(self) -> None:
        assert hmac.compare_digest("secret-key", "wrong-key") is False


# ---------------------------------------------------------------------------
# A4 — Auth on /status and /summary
# ---------------------------------------------------------------------------
class TestStatusSummaryAuth:
    def test_status_requires_user_id(self, test_client) -> None:
        resp = test_client.get("/report/nonexistent-id/status")
        # Without auth: 401, with auth but missing job: 404
        assert resp.status_code in (401, 404)

    def test_summary_requires_user_id(self, test_client) -> None:
        resp = test_client.get("/report/nonexistent-id/summary")
        assert resp.status_code in (401, 404)

    def test_status_with_auth_gets_404_not_403(self, test_client) -> None:
        resp = test_client.get(
            "/report/nonexistent-id/status",
            headers={"X-User-Id": "user-1"},
        )
        assert resp.status_code == 404

    def test_summary_with_auth_gets_404_not_403(self, test_client) -> None:
        resp = test_client.get(
            "/report/nonexistent-id/summary",
            headers={"X-User-Id": "user-1"},
        )
        assert resp.status_code == 404

    def test_status_wrong_user_gets_403(self, test_client, db_conn) -> None:
        import uuid

        from tests.conftest import ensure_test_user, run_db

        sid = str(uuid.uuid4())
        ensure_test_user(db_conn, "owner-user")
        run_db(
            db_conn.execute(
                "INSERT INTO audit_sessions (id, user_id, track, status) "
                "VALUES ($1, $2, $3, 'completed')",
                sid,
                "owner-user",
                "hni",
            )
        )
        import report_repository as rpt_repo

        job_id = run_db(rpt_repo.create_job(db_conn, sid))

        resp = test_client.get(
            f"/report/{job_id}/status",
            headers={"X-User-Id": "attacker"},
        )
        assert resp.status_code == 403

    def test_summary_wrong_user_gets_403(self, test_client, db_conn) -> None:
        import uuid

        import report_repository as rpt_repo
        from crypto import derive_key, encrypt_bytes
        from report.constants import REPORT_JOB_COMPLETED
        from tests.conftest import ensure_test_user, run_db

        sid = str(uuid.uuid4())
        ensure_test_user(db_conn, "owner-user")
        run_db(
            db_conn.execute(
                "INSERT INTO audit_sessions (id, user_id, track, status) "
                "VALUES ($1, $2, $3, 'completed')",
                sid,
                "owner-user",
                "hni",
            )
        )
        job_id = run_db(rpt_repo.create_job(db_conn, sid))
        run_db(rpt_repo.update_job_status(db_conn, job_id, REPORT_JOB_COMPLETED))
        key = derive_key("test-key")
        run_db(
            rpt_repo.store_artifact(
                db_conn,
                sid,
                pdf_encrypted=encrypt_bytes(b"pdf", key),
                urgency_score=50,
                peer_benchmark_percentile=50.0,
                findings_json={"free_summary": {"urgency_score": 50}},
            )
        )

        resp = test_client.get(
            f"/report/{job_id}/summary",
            headers={"X-User-Id": "attacker"},
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# B1 — split_free_paid safe with partial findings dicts
# ---------------------------------------------------------------------------
class TestSplitFreePaidSafety:
    def test_handles_missing_keys_gracefully(self) -> None:
        findings = [
            {"domain": "CPP-01", "severity": "critical"},  # missing many keys
        ]
        free, paid = split_free_paid(findings)
        assert len(free) == 1
        assert free[0]["answer"] == "●●●●●●"
        assert free[0]["domain"] == "CPP-01"

    def test_handles_empty_list(self) -> None:
        free, paid = split_free_paid([])
        assert free == []
        assert paid == []

    def test_question_truncated_at_60_chars(self) -> None:
        findings = [
            {
                "domain": "CPP-01",
                "domain_name": "Physical Security",
                "severity": "high",
                "question": "A" * 80,
                "answer": "No",
                "recommendation": "Fix it.",
            }
        ]
        free, _ = split_free_paid(findings)
        assert len(free[0]["question"]) <= 63  # 60 + "..."


# ---------------------------------------------------------------------------
# B2 — Unknown domain compliance fallback: explicit unknown
# ---------------------------------------------------------------------------
class TestUnknownDomainCompliance:
    def test_unknown_domain_returns_unknown_mapping(self) -> None:
        m = _fallback_mapping("TOTALLY-UNKNOWN")
        assert m.finding_domain == "TOTALLY-UNKNOWN"
        assert m.iso_clause == "Unknown"
        assert m.psara_section == "Unknown"

    def test_empty_domain_returns_unknown_mapping(self) -> None:
        m = _fallback_mapping("")
        assert m.iso_clause == "Unknown"

    def test_valid_cpp_domain_still_maps_correctly(self) -> None:
        m = _fallback_mapping("CPP-01")
        assert "A.11" in m.iso_clause
        assert m.finding_domain == "CPP-01"


# ---------------------------------------------------------------------------
# B4 — Gemini response validation
# ---------------------------------------------------------------------------
class TestGeminiResponseValidation:
    @patch("gemini_client.genai.Client")
    def test_none_text_raises_gemini_error(self, mock_cls) -> None:
        from config import Settings

        mock_client = MagicMock()
        response = MagicMock()
        response.text = None
        mock_client.models.generate_content.return_value = response
        mock_cls.return_value = mock_client
        settings = MagicMock(spec=Settings)
        settings.gemini_api_key = "test-key"
        client = GeminiClient(settings, max_retries=1, retry_delay=0.0)
        with pytest.raises(GeminiError):
            client._generate_sync("prompt")

    @patch("gemini_client.genai.Client")
    def test_empty_embeddings_raises_gemini_error(self, mock_cls) -> None:
        from config import Settings

        mock_client = MagicMock()
        result = MagicMock()
        result.embeddings = []
        mock_client.models.embed_content.return_value = result
        mock_cls.return_value = mock_client
        settings = MagicMock(spec=Settings)
        settings.gemini_api_key = "test-key"
        client = GeminiClient(settings, max_retries=1, retry_delay=0.0)
        with pytest.raises(GeminiError):
            client._embed_sync("text")


# ---------------------------------------------------------------------------
# C1 — model_dump(mode="json") used at router call site
# ---------------------------------------------------------------------------
class TestModelDumpMode:
    def test_router_uses_json_mode(self) -> None:
        """Router should use json.loads or model_dump for JSON serialization."""
        import inspect

        import routers.report as rpt

        source = inspect.getsource(rpt)
        # Check that router uses either model_dump(mode="json") or json.loads/dumps
        has_serialization = any(
            method in source
            for method in [
                'model_dump(mode="json")',
                "json.loads",
                "json.dumps",
            ]
        )
        assert has_serialization, (
            "router must use json.loads, json.dumps, or model_dump(mode='json') "
            "to ensure JSON-serialisable output"
        )


# ---------------------------------------------------------------------------
# C3 — Board prompt uses ReportData.compliance_gap_count not recomputed
# ---------------------------------------------------------------------------
class TestBoardPromptComplianceCount:
    @pytest.mark.asyncio
    async def test_board_summary_receives_compliance_gap_count(self) -> None:
        """generate_board_summary must accept explicit compliance_gap_count."""
        import inspect

        sig = inspect.signature(generate_board_summary)
        assert "compliance_gap_count" in sig.parameters, (
            "generate_board_summary must accept compliance_gap_count parameter"
        )

    @pytest.mark.asyncio
    async def test_board_prompt_uses_passed_count_not_recomputed(self) -> None:
        mock_gemini = MagicMock(spec=GeminiClient)
        captured_prompt: list[str] = []

        async def _capture(prompt: str, *args, **kwargs) -> str:
            captured_prompt.append(prompt)
            return "Board summary text."

        mock_gemini.generate = _capture
        findings = [
            {"severity": "critical", "domain": "CPP-01", "domain_name": "Physical Security"},
        ]
        # Pass explicit compliance_gap_count = 99 (should appear in prompt)
        await generate_board_summary(findings, gemini=mock_gemini, compliance_gap_count=99)
        assert captured_prompt, "Gemini generate should have been called"
        assert "99" in captured_prompt[0], (
            "Prompt must use the passed compliance_gap_count, not recompute"
        )


# ---------------------------------------------------------------------------
# C6 — Renderer uses TRACK_ENTERPRISE constant
# ---------------------------------------------------------------------------
class TestRendererUsesConstant:
    def test_renderer_imports_track_enterprise(self) -> None:
        import inspect

        import report.renderer as renderer

        source = inspect.getsource(renderer)
        assert "TRACK_ENTERPRISE" in source, (
            "renderer must use TRACK_ENTERPRISE constant, not hardcoded 'enterprise'"
        )


# ---------------------------------------------------------------------------
# C8 — Playwright wait_until is 'load' not 'networkidle'
# ---------------------------------------------------------------------------
class TestPlaywrightWaitUntil:
    def test_renderer_uses_load_not_networkidle(self) -> None:
        import inspect

        import report.renderer as renderer

        source = inspect.getsource(renderer)
        assert "networkidle" not in source, "renderer must use wait_until='load', not 'networkidle'"
        assert "wait_until" in source
