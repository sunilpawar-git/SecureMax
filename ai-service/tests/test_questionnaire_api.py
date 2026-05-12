"""Integration tests for questionnaire API endpoints — Phase 4."""

import pytest
from fastapi.testclient import TestClient

from main import app
from routers.questionnaire import store


@pytest.fixture(autouse=True)
def reset_store() -> None:
    store.reset()


client = TestClient(app)


class TestStartSession:
    def test_start_hni_session(self) -> None:
        resp = client.post("/questionnaire/start", json={"user_id": "user-1", "track": "hni"})
        assert resp.status_code == 200
        data = resp.json()
        assert "session_id" in data
        assert data["first_question"]["id"] == "hni_q1_property_type"
        assert data["first_question"]["question_type"] == "single_choice"
        assert all(v == 100.0 for v in data["radar_scores"].values())

    def test_start_enterprise_session(self) -> None:
        resp = client.post(
            "/questionnaire/start", json={"user_id": "user-2", "track": "enterprise"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["first_question"]["id"] == "ent_q1_facility_type"

    def test_start_duplicate_session_blocked(self) -> None:
        client.post("/questionnaire/start", json={"user_id": "user-3", "track": "hni"})
        resp = client.post("/questionnaire/start", json={"user_id": "user-3", "track": "hni"})
        assert resp.status_code == 409

    def test_invalid_track_rejected(self) -> None:
        resp = client.post("/questionnaire/start", json={"user_id": "user-4", "track": "invalid"})
        assert resp.status_code == 422


class TestSubmitAnswer:
    def _start_hni(self) -> str:
        resp = client.post(
            "/questionnaire/start", json={"user_id": "user-answer-test", "track": "hni"}
        )
        return resp.json()["session_id"]

    def test_submit_first_answer(self) -> None:
        session_id = self._start_hni()
        resp = client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "hni_q1_property_type",
                "answer": "Villa",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_complete"] is False
        assert data["next_question"]["id"] == "hni_q2_existing_vendor"

    def test_wrong_question_id_rejected(self) -> None:
        session_id = self._start_hni()
        resp = client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "wrong_id",
                "answer": "Villa",
            },
        )
        assert resp.status_code == 400

    def test_answer_to_completed_session_rejected(self) -> None:
        session_id = self._start_hni()
        store.complete_session(session_id)
        resp = client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "hni_q1_property_type",
                "answer": "Villa",
            },
        )
        assert resp.status_code == 400

    def test_radar_scores_drop_on_negative_answer(self) -> None:
        session_id = self._start_hni()
        client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "hni_q1_property_type",
                "answer": "Villa",
            },
        )
        client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "hni_q2_existing_vendor",
                "answer": "No",
            },
        )
        resp = client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "hni_q3_incident_history",
                "answer": "Yes",
            },
        )
        data = resp.json()
        assert data["radar_scores"]["CPP-07"] < 100.0


class TestResumeSession:
    def test_resume_active_session(self) -> None:
        resp = client.post("/questionnaire/start", json={"user_id": "user-resume", "track": "hni"})
        session_id = resp.json()["session_id"]
        client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": "hni_q1_property_type",
                "answer": "Apartment",
            },
        )
        resp = client.post("/questionnaire/resume", json={"session_id": session_id})
        assert resp.status_code == 200
        data = resp.json()
        assert data["current_question"]["id"] == "hni_q2_existing_vendor"
        assert data["questions_answered"] == 1

    def test_resume_completed_session_rejected(self) -> None:
        resp = client.post(
            "/questionnaire/start", json={"user_id": "user-resume-done", "track": "hni"}
        )
        session_id = resp.json()["session_id"]
        store.complete_session(session_id)
        resp = client.post("/questionnaire/resume", json={"session_id": session_id})
        assert resp.status_code == 400


class TestAbandonSession:
    def test_abandon_allows_new_session(self) -> None:
        resp = client.post("/questionnaire/start", json={"user_id": "user-abandon", "track": "hni"})
        session_id = resp.json()["session_id"]
        resp = client.post(f"/questionnaire/{session_id}/abandon")
        assert resp.status_code == 200

        resp = client.post("/questionnaire/start", json={"user_id": "user-abandon", "track": "hni"})
        assert resp.status_code == 200

    def test_resume_abandoned_session_rejected(self) -> None:
        resp = client.post("/questionnaire/start", json={"user_id": "user-ab2", "track": "hni"})
        session_id = resp.json()["session_id"]
        client.post(f"/questionnaire/{session_id}/abandon")

        resp = client.post(
            "/questionnaire/resume",
            json={
                "session_id": session_id,
            },
        )
        assert resp.status_code == 400
        assert "abandoned" in resp.json()["detail"]


class TestOwnershipVerification:
    def test_other_user_cannot_answer(self) -> None:
        resp = client.post("/questionnaire/start", json={"user_id": "owner-1", "track": "hni"})
        session_id = resp.json()["session_id"]
        first_qid = resp.json()["first_question"]["id"]

        resp = client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": first_qid,
                "answer": "Villa",
            },
            headers={"X-User-Id": "attacker-99"},
        )
        assert resp.status_code == 403

    def test_owner_can_answer(self) -> None:
        resp = client.post("/questionnaire/start", json={"user_id": "owner-2", "track": "hni"})
        session_id = resp.json()["session_id"]
        first_qid = resp.json()["first_question"]["id"]

        resp = client.post(
            "/questionnaire/answer",
            json={
                "session_id": session_id,
                "question_id": first_qid,
                "answer": "Villa",
            },
            headers={"X-User-Id": "owner-2"},
        )
        assert resp.status_code == 200


class TestFullHNIFlow:
    """Golden path: walk through several questions and verify state."""

    def test_golden_path_first_five_questions(self) -> None:
        resp = client.post("/questionnaire/start", json={"user_id": "user-golden", "track": "hni"})
        session_id = resp.json()["session_id"]

        questions_answered = [
            ("hni_q1_property_type", "Villa"),
            ("hni_q2_existing_vendor", "No"),
            ("hni_q3_incident_history", "No"),
            ("hni_cpp01_perimeter", "Boundary wall"),
            ("hni_cpp01_cctv", "Yes — some blind spots"),
        ]

        for qid, answer in questions_answered:
            resp = client.post(
                "/questionnaire/answer",
                json={
                    "session_id": session_id,
                    "question_id": qid,
                    "answer": answer,
                },
            )
            assert resp.status_code == 200

        data = resp.json()
        assert data["is_complete"] is False
        assert data["next_question"]["id"] == "hni_cpp01_gate_code"
        assert data["radar_scores"]["CPP-01"] < 100.0
