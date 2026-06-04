"""Integration tests for questionnaire API endpoints — Phase 4."""

import asyncpg

import session_repository as repo
from tests.conftest import _DSN, TEST_SCHEMA, run_db, seed_test_user


def _start(test_client, user_id: str, track: str = "hni"):
    """Start a session with correct X-User-Id header (matches body user_id)."""

    async def _seed():
        conn = await asyncpg.connect(_DSN)
        await conn.execute(f"SET search_path TO {TEST_SCHEMA}, public")
        try:
            await seed_test_user(conn, user_id)
        finally:
            await conn.close()

    run_db(_seed())
    return test_client.post(
        "/questionnaire/start",
        json={"user_id": user_id, "track": track},
        headers={"X-User-Id": user_id},
    )


class TestStartSession:
    def test_start_hni_session(self, test_client) -> None:
        resp = _start(test_client, "user-1")
        assert resp.status_code == 200
        data = resp.json()
        assert "session_id" in data
        assert data["first_question"]["id"] == "hni_q1_property_type"
        assert data["first_question"]["question_type"] == "single_choice"
        assert all(v == 100.0 for v in data["radar_scores"].values())

    def test_start_enterprise_session(self, test_client) -> None:
        resp = _start(test_client, "user-2", "enterprise")
        assert resp.status_code == 200
        data = resp.json()
        assert data["first_question"]["id"] == "ent_q1_facility_type"

    def test_start_duplicate_session_blocked(self, test_client) -> None:
        _start(test_client, "user-3")
        resp = _start(test_client, "user-3")
        assert resp.status_code == 409

    def test_invalid_track_rejected(self, test_client) -> None:
        resp = test_client.post(
            "/questionnaire/start",
            json={"user_id": "user-4", "track": "invalid"},
            headers={"X-User-Id": "user-4"},
        )
        assert resp.status_code == 422

    def test_start_missing_auth_rejected(self, test_client) -> None:
        """No X-User-Id header must return 401."""
        resp = test_client.post(
            "/questionnaire/start",
            json={"user_id": "user-5", "track": "hni"},
        )
        assert resp.status_code == 401

    def test_start_mismatched_user_id_rejected(self, test_client) -> None:
        """X-User-Id must match body user_id."""
        resp = test_client.post(
            "/questionnaire/start",
            json={"user_id": "user-real", "track": "hni"},
            headers={"X-User-Id": "attacker"},
        )
        assert resp.status_code == 403

    def test_start_unknown_user_returns_clear_error_not_500(self, test_client) -> None:
        """Missing users row must fail loudly — not an opaque 500 (DB misconfiguration)."""
        resp = test_client.post(
            "/questionnaire/start",
            json={"user_id": "ghost-user-no-row", "track": "hni"},
            headers={"X-User-Id": "ghost-user-no-row"},
        )
        assert resp.status_code == 404
        assert "same database" in resp.json()["detail"].lower()


class TestSubmitAnswer:
    def _start_hni(self, test_client, user_id: str = "user-answer-test") -> str:
        resp = _start(test_client, user_id)
        return resp.json()["session_id"]

    def test_submit_first_answer(self, test_client) -> None:
        session_id = self._start_hni(test_client)
        resp = test_client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "hni_q1_property_type",
                "answer": "Villa",
            },
            headers={"X-User-Id": "user-answer-test"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_complete"] is False
        assert data["next_question"]["id"] == "hni_q2_existing_vendor"

    def test_answer_missing_auth_rejected(self, test_client) -> None:
        """Missing X-User-Id on answer must return 401."""
        session_id = self._start_hni(test_client)
        resp = test_client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "hni_q1_property_type",
                "answer": "Villa",
            },
        )
        assert resp.status_code == 401

    def test_wrong_question_id_rejected(self, test_client) -> None:
        session_id = self._start_hni(test_client)
        resp = test_client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "wrong_id",
                "answer": "Villa",
            },
            headers={"X-User-Id": "user-answer-test"},
        )
        assert resp.status_code == 400

    def test_answer_to_completed_session_rejected(self, test_client, db_conn) -> None:
        from tests.conftest import run_db

        session_id = self._start_hni(test_client)
        run_db(repo.complete_session(db_conn, session_id))

        resp = test_client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "hni_q1_property_type",
                "answer": "Villa",
            },
            headers={"X-User-Id": "user-answer-test"},
        )
        assert resp.status_code == 400

    def test_radar_scores_drop_on_negative_answer(self, test_client) -> None:
        uid = "user-radar"
        session_id = self._start_hni(test_client, uid)
        for qid, ans in [
            ("hni_q1_property_type", "Villa"),
            ("hni_q2_existing_vendor", "No"),
        ]:
            test_client.post(
                "/questionnaire/answer",
                json={"session_id": session_id, "question_id": qid, "answer": ans},
                headers={"X-User-Id": uid},
            )
        resp = test_client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "hni_q3_incident_history",
                "answer": "Yes",
            },
            headers={"X-User-Id": uid},
        )
        data = resp.json()
        assert data["radar_scores"]["CPP-07"] < 100.0


class TestResumeSession:
    def test_resume_active_session(self, test_client) -> None:
        resp = _start(test_client, "user-resume")
        session_id = resp.json()["session_id"]
        test_client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "hni_q1_property_type",
                "answer": "Apartment",
            },
            headers={"X-User-Id": "user-resume"},
        )
        resp = test_client.post(
            "/questionnaire/resume",
            json={"session_id": session_id},
            headers={"X-User-Id": "user-resume"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["current_question"]["id"] == "hni_q2_existing_vendor"
        assert data["questions_answered"] == 1

    def test_resume_missing_auth_rejected(self, test_client) -> None:
        resp = _start(test_client, "user-resume-noauth")
        session_id = resp.json()["session_id"]
        resp = test_client.post("/questionnaire/resume", json={"session_id": session_id})
        assert resp.status_code == 401

    def test_resume_completed_session_rejected(self, test_client, db_conn) -> None:
        from tests.conftest import run_db

        resp = _start(test_client, "user-resume-done")
        session_id = resp.json()["session_id"]
        run_db(repo.complete_session(db_conn, session_id))

        resp = test_client.post(
            "/questionnaire/resume",
            json={"session_id": session_id},
            headers={"X-User-Id": "user-resume-done"},
        )
        assert resp.status_code == 400


class TestAbandonSession:
    def test_abandon_allows_new_session(self, test_client) -> None:
        resp = _start(test_client, "user-abandon")
        session_id = resp.json()["session_id"]
        resp = test_client.post(
            f"/questionnaire/{session_id}/abandon",
            headers={"X-User-Id": "user-abandon"},
        )
        assert resp.status_code == 200

        resp = _start(test_client, "user-abandon")
        assert resp.status_code == 200

    def test_abandon_missing_auth_rejected(self, test_client) -> None:
        resp = _start(test_client, "user-ab-noauth")
        session_id = resp.json()["session_id"]
        resp = test_client.post(f"/questionnaire/{session_id}/abandon")
        assert resp.status_code == 401

    def test_resume_abandoned_session_rejected(self, test_client) -> None:
        resp = _start(test_client, "user-ab2")
        session_id = resp.json()["session_id"]
        test_client.post(
            f"/questionnaire/{session_id}/abandon",
            headers={"X-User-Id": "user-ab2"},
        )

        resp = test_client.post(
            "/questionnaire/resume",
            json={"session_id": session_id},
            headers={"X-User-Id": "user-ab2"},
        )
        assert resp.status_code == 400
        assert "abandoned" in resp.json()["detail"]


class TestOwnershipVerification:
    def test_other_user_cannot_answer(self, test_client) -> None:
        resp = _start(test_client, "owner-1")
        session_id = resp.json()["session_id"]
        first_qid = resp.json()["first_question"]["id"]

        resp = test_client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": first_qid,
                "answer": "Villa",
            },
            headers={"X-User-Id": "attacker-99"},
        )
        assert resp.status_code == 403

    def test_missing_header_cannot_answer(self, test_client) -> None:
        """Omitting X-User-Id entirely must return 401 (fail-closed)."""
        resp = _start(test_client, "owner-3")
        session_id = resp.json()["session_id"]
        first_qid = resp.json()["first_question"]["id"]

        resp = test_client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": first_qid,
                "answer": "Villa",
            },
        )
        assert resp.status_code == 401

    def test_owner_can_answer(self, test_client) -> None:
        resp = _start(test_client, "owner-2")
        session_id = resp.json()["session_id"]
        first_qid = resp.json()["first_question"]["id"]

        resp = test_client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": first_qid,
                "answer": "Villa",
            },
            headers={"X-User-Id": "owner-2"},
        )
        assert resp.status_code == 200


class TestCppCitations:
    def test_answer_response_includes_cpp_citations_field(self, test_client) -> None:
        resp = _start(test_client, "user-citations")
        session_id = resp.json()["session_id"]
        resp = test_client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "hni_q1_property_type",
                "answer": "Villa",
            },
            headers={"X-User-Id": "user-citations"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "cpp_citations" in data
        assert isinstance(data["cpp_citations"], list)


class TestAIBranchedFlag:
    def test_ai_branched_false_on_any_edge(self, test_client) -> None:
        """When all edges are 'any' or single-path, ai_branched must be False."""
        resp = _start(test_client, "user-branch-any")
        session_id = resp.json()["session_id"]
        resp = test_client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "hni_q1_property_type",
                "answer": "Villa",
            },
            headers={"X-User-Id": "user-branch-any"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ai_branched"] is False

    def test_response_includes_ai_branched_field(self, test_client) -> None:
        resp = _start(test_client, "user-branch-field")
        session_id = resp.json()["session_id"]
        resp = test_client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "hni_q1_property_type",
                "answer": "Villa",
            },
            headers={"X-User-Id": "user-branch-field"},
        )
        data = resp.json()
        assert "ai_branched" in data
        assert isinstance(data["ai_branched"], bool)


class TestFullHNIFlow:
    """Golden path: walk through several questions and verify state."""

    def test_golden_path_first_five_questions(self, test_client) -> None:
        uid = "user-golden"
        resp = _start(test_client, uid)
        session_id = resp.json()["session_id"]

        questions_answered = [
            ("hni_q1_property_type", "Villa"),
            ("hni_q2_existing_vendor", "No"),
            ("hni_q3_incident_history", "No"),
            ("hni_cpp01_perimeter", "Boundary wall"),
            ("hni_cpp01_cctv", "Yes — some blind spots"),
        ]

        for qid, answer in questions_answered:
            resp = test_client.post(
                "/questionnaire/answer",
                json={
                    "session_id": session_id,
                    "question_id": qid,
                    "answer": answer,
                },
                headers={"X-User-Id": uid},
            )
            assert resp.status_code == 200

        data = resp.json()
        assert data["is_complete"] is False
        assert data["next_question"]["id"] == "hni_cpp01_gate_code"
        assert data["radar_scores"]["CPP-01"] < 100.0
