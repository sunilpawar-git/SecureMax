"""
Phase 1 — Fix 1: ReportStatusResponse includes `downloadable` field.

TDD: Tests assert that GET /report/{id}/status returns a `downloadable`
boolean that reflects the session's paid/enterprise_report_unlocked state.
"""

import uuid

import report_repository as rpt_repo
from tests.conftest import run_db


def _create_session(
    db_conn,
    user_id: str = "dl-user-1",
    track: str = "hni",
    paid: bool = False,
    enterprise_unlocked: bool = False,
) -> str:
    session_id = str(uuid.uuid4())
    run_db(
        db_conn.execute(
            """
            INSERT INTO audit_sessions
                (id, user_id, track, status, paid, enterprise_report_unlocked)
            VALUES ($1, $2, $3, 'completed', $4, $5)
            """,
            session_id,
            user_id,
            track,
            paid,
            enterprise_unlocked,
        )
    )
    return session_id


class TestReportStatusDownloadable:
    """GET /report/{id}/status must include downloadable field."""

    def test_status_response_includes_downloadable_field(self, test_client, db_conn) -> None:
        session_id = _create_session(db_conn, paid=False)
        job_id = run_db(rpt_repo.create_job(db_conn, session_id))
        resp = test_client.get(
            f"/report/{job_id}/status",
            headers={"X-Service-Key": "test", "X-User-Id": "dl-user-1"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "downloadable" in data

    def test_unpaid_session_is_not_downloadable(self, test_client, db_conn) -> None:
        session_id = _create_session(db_conn, paid=False)
        job_id = run_db(rpt_repo.create_job(db_conn, session_id))
        resp = test_client.get(
            f"/report/{job_id}/status",
            headers={"X-Service-Key": "test", "X-User-Id": "dl-user-1"},
        )
        assert resp.status_code == 200
        assert resp.json()["downloadable"] is False

    def test_paid_session_is_downloadable(self, test_client, db_conn) -> None:
        session_id = _create_session(db_conn, paid=True)
        job_id = run_db(rpt_repo.create_job(db_conn, session_id))
        resp = test_client.get(
            f"/report/{job_id}/status",
            headers={"X-Service-Key": "test", "X-User-Id": "dl-user-1"},
        )
        assert resp.status_code == 200
        assert resp.json()["downloadable"] is True

    def test_enterprise_unlocked_is_downloadable(self, test_client, db_conn) -> None:
        session_id = _create_session(
            db_conn,
            track="enterprise",
            enterprise_unlocked=True,
        )
        job_id = run_db(rpt_repo.create_job(db_conn, session_id))
        resp = test_client.get(
            f"/report/{job_id}/status",
            headers={"X-Service-Key": "test", "X-User-Id": "dl-user-1"},
        )
        assert resp.status_code == 200
        assert resp.json()["downloadable"] is True
