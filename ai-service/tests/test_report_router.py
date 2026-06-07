"""
Tests for the DB-backed report router — replaces in-memory _report_store.
Tests the repository layer directly + router logic via mocked DB fixtures.
"""

import json

import asyncpg
import pytest

import report_repository as rpt_repo
from crypto import decrypt_bytes, derive_key, encrypt_bytes
from report.constants import (
    REPORT_JOB_COMPLETED,
    REPORT_JOB_FAILED,
    REPORT_JOB_PENDING,
    REPORT_JOB_PROCESSING,
)
from tests.conftest import ensure_test_user, run_db


def _create_session(db_conn, user_id: str = "rpt-user-1", track: str = "hni") -> str:
    """Insert a completed audit session into the test DB."""
    import uuid

    session_id = str(uuid.uuid4())
    ensure_test_user(db_conn, user_id)
    run_db(
        db_conn.execute(
            """
            INSERT INTO audit_sessions (id, user_id, track, status)
            VALUES ($1, $2, $3, 'completed')
            """,
            session_id,
            user_id,
            track,
        )
    )
    return session_id


class TestReportJobRepository:
    def test_create_job(self, db_conn) -> None:
        session_id = _create_session(db_conn)
        job_id = run_db(rpt_repo.create_job(db_conn, session_id))
        assert job_id
        job = run_db(rpt_repo.get_job(db_conn, job_id))
        assert job is not None
        assert job["status"] == REPORT_JOB_PENDING
        assert job["session_id"] == session_id

    def test_get_job_by_session(self, db_conn) -> None:
        session_id = _create_session(db_conn)
        job_id = run_db(rpt_repo.create_job(db_conn, session_id))
        found = run_db(rpt_repo.get_job_by_session(db_conn, session_id))
        assert found is not None
        assert found["id"] == job_id

    def test_get_nonexistent_job_returns_none(self, db_conn) -> None:
        result = run_db(rpt_repo.get_job(db_conn, "does-not-exist"))
        assert result is None

    def test_update_job_status(self, db_conn) -> None:
        session_id = _create_session(db_conn)
        job_id = run_db(rpt_repo.create_job(db_conn, session_id))
        run_db(rpt_repo.update_job_status(db_conn, job_id, REPORT_JOB_PROCESSING))
        job = run_db(rpt_repo.get_job(db_conn, job_id))
        assert job["status"] == REPORT_JOB_PROCESSING

    def test_update_job_failed_with_error(self, db_conn) -> None:
        session_id = _create_session(db_conn)
        job_id = run_db(rpt_repo.create_job(db_conn, session_id))
        run_db(rpt_repo.update_job_status(db_conn, job_id, REPORT_JOB_FAILED, error_message="boom"))
        job = run_db(rpt_repo.get_job(db_conn, job_id))
        assert job["status"] == REPORT_JOB_FAILED
        assert job["error_message"] == "boom"

    def test_invalid_status_raises(self, db_conn) -> None:
        session_id = _create_session(db_conn)
        job_id = run_db(rpt_repo.create_job(db_conn, session_id))
        with pytest.raises(ValueError, match="Invalid job status"):
            run_db(rpt_repo.update_job_status(db_conn, job_id, "invalid"))

    def test_idempotent_session_unique(self, db_conn) -> None:
        """Only one job per session — unique constraint."""
        session_id = _create_session(db_conn)
        run_db(rpt_repo.create_job(db_conn, session_id))
        with pytest.raises(asyncpg.UniqueViolationError):
            run_db(rpt_repo.create_job(db_conn, session_id))


class TestReportArtifactRepository:
    _TEST_KEY = derive_key("test-key-for-report-artifacts")

    def _sample_findings(self) -> dict:
        return {
            "findings": [
                {
                    "domain": "CPP-01",
                    "severity": "critical",
                    "recommendation": "Fix it.",
                }
            ],
            "free_summary": {"urgency_score": 80},
        }

    def test_store_and_retrieve_artifact(self, db_conn) -> None:
        session_id = _create_session(db_conn)
        pdf_plain = b"%PDF-1.4 test content"
        pdf_enc = encrypt_bytes(pdf_plain, self._TEST_KEY)

        artifact_id = run_db(
            rpt_repo.store_artifact(
                db_conn,
                session_id,
                pdf_encrypted=pdf_enc,
                urgency_score=80,
                peer_benchmark_percentile=35.0,
                findings_json=self._sample_findings(),
            )
        )
        assert artifact_id

        art = run_db(rpt_repo.get_artifact_by_session(db_conn, session_id))
        assert art is not None
        assert art["audit_urgency_score"] == 80
        assert art["peer_benchmark_percentile"] == 35.0

        decrypted = decrypt_bytes(bytes(art["pdf_encrypted"]), self._TEST_KEY)
        assert decrypted == pdf_plain

    def test_findings_json_roundtrip(self, db_conn) -> None:
        session_id = _create_session(db_conn)
        findings = self._sample_findings()
        pdf_enc = encrypt_bytes(b"pdf", self._TEST_KEY)
        run_db(
            rpt_repo.store_artifact(
                db_conn,
                session_id,
                pdf_encrypted=pdf_enc,
                urgency_score=50,
                peer_benchmark_percentile=60.0,
                findings_json=findings,
            )
        )
        art = run_db(rpt_repo.get_artifact_by_session(db_conn, session_id))
        stored = json.loads(art["findings_json"])
        assert stored == findings

    def test_compliance_gap_count_stored(self, db_conn) -> None:
        session_id = _create_session(db_conn, track="enterprise")
        pdf_enc = encrypt_bytes(b"pdf", self._TEST_KEY)
        run_db(
            rpt_repo.store_artifact(
                db_conn,
                session_id,
                pdf_encrypted=pdf_enc,
                urgency_score=70,
                peer_benchmark_percentile=20.0,
                findings_json=self._sample_findings(),
                compliance_gap_count=5,
            )
        )
        art = run_db(rpt_repo.get_artifact_by_session(db_conn, session_id))
        assert art["compliance_gap_count"] == 5

    def test_nonexistent_session_returns_none(self, db_conn) -> None:
        result = run_db(rpt_repo.get_artifact_by_session(db_conn, "no-session"))
        assert result is None


class TestReportJobLifecycle:
    """End-to-end lifecycle: create → processing → completed with artifact."""

    _TEST_KEY = derive_key("lifecycle-test-key")

    def test_full_lifecycle(self, db_conn) -> None:
        session_id = _create_session(db_conn)

        job_id = run_db(rpt_repo.create_job(db_conn, session_id))
        job = run_db(rpt_repo.get_job(db_conn, job_id))
        assert job["status"] == REPORT_JOB_PENDING

        run_db(rpt_repo.update_job_status(db_conn, job_id, REPORT_JOB_PROCESSING))

        pdf_enc = encrypt_bytes(b"final-pdf", self._TEST_KEY)
        run_db(
            rpt_repo.store_artifact(
                db_conn,
                session_id,
                pdf_encrypted=pdf_enc,
                urgency_score=65,
                peer_benchmark_percentile=45.0,
                findings_json={"findings": []},
            )
        )

        run_db(rpt_repo.update_job_status(db_conn, job_id, REPORT_JOB_COMPLETED))

        job = run_db(rpt_repo.get_job(db_conn, job_id))
        assert job["status"] == REPORT_JOB_COMPLETED

        art = run_db(rpt_repo.get_artifact_by_session(db_conn, session_id))
        assert art is not None
        decrypted = decrypt_bytes(bytes(art["pdf_encrypted"]), self._TEST_KEY)
        assert decrypted == b"final-pdf"
