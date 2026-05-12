"""Tests for report generation — Phase 5 verification."""

import pytest
from fastapi.testclient import TestClient

from main import app
from report.findings import (
    classify_severity,
    compute_peer_benchmark,
    compute_urgency_score,
    generate_findings,
    split_free_paid,
)
from routers.questionnaire import store
from routers.report import reset_report_store

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_state() -> None:
    store.reset()
    reset_report_store()


def _create_completed_session(track: str = "hni") -> str:
    resp = client.post("/questionnaire/start", json={
        "user_id": f"report-user-{track}", "track": track
    })
    session_id = resp.json()["session_id"]

    if track == "hni":
        answers = [
            ("hni_q1_property_type", "Villa"),
            ("hni_q2_existing_vendor", "No"),
            ("hni_q3_incident_history", "Yes"),
        ]
    else:
        answers = [
            ("ent_q1_facility_type", "Fulfilment Centre"),
            ("ent_q2_existing_vendor", "No"),
            ("ent_q3_compliance_audit", "No"),
        ]

    for qid, answer in answers:
        client.post("/questionnaire/answer", json={
            "session_id": session_id,
            "question_id": qid,
            "answer": answer,
        })

    store.complete_session(session_id)
    return session_id


class TestFindingsEngine:
    def test_generate_findings_from_negative_answers(self) -> None:
        events = [
            {"domain": "CPP-01", "question_text": "Q1",
             "answer": "No", "score_drop_trigger": True},
            {"domain": "CPP-05", "question_text": "Q2",
             "answer": "Never", "score_drop_trigger": False},
        ]
        findings = generate_findings(events)
        assert len(findings) == 2
        assert findings[0]["severity"] == "critical"
        assert findings[1]["severity"] == "high"

    def test_positive_answers_generate_no_findings(self) -> None:
        events = [
            {"domain": "CPP-01", "question_text": "Q1",
             "answer": "Yes — full coverage", "score_drop_trigger": True},
        ]
        findings = generate_findings(events)
        assert len(findings) == 0

    def test_classify_severity_logic(self) -> None:
        assert classify_severity("No", True) == "critical"
        assert classify_severity("No", False) == "high"
        assert classify_severity("Sometimes", True) == "high"
        assert classify_severity("Sometimes", False) == "medium"
        assert classify_severity("Yes — all areas", False) == "low"

    def test_urgency_score_range(self) -> None:
        event = {
            "domain": "CPP-01", "question_text": "Q",
            "answer": "No", "score_drop_trigger": True,
        }
        events = [event] * 5
        findings = generate_findings(events)
        score = compute_urgency_score(findings)
        assert 0 <= score <= 100

    def test_urgency_score_zero_for_no_findings(self) -> None:
        assert compute_urgency_score([]) == 0

    def test_peer_benchmark_structure(self) -> None:
        benchmark = compute_peer_benchmark(55)
        assert "user_score" in benchmark
        assert "peer_average" in benchmark
        assert "percentile" in benchmark
        assert "interpretation" in benchmark
        assert benchmark["user_score"] == 55

    def test_split_free_paid_blurs_answers(self) -> None:
        findings = [
            {"domain": "CPP-01", "domain_name": "Physical Security", "severity": "critical",
             "question": "Is the gate locked?", "answer": "No", "recommendation": "Lock the gate."},
        ]
        free, paid = split_free_paid(findings)
        assert free[0]["answer"] == "●●●●●●"
        assert paid[0]["answer"] == "No"


class TestReportAPI:
    def test_generate_hni_report(self) -> None:
        session_id = _create_completed_session("hni")
        resp = client.post("/report/generate", json={"session_id": session_id})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"
        assert "report_id" in data

    def test_generate_enterprise_report(self) -> None:
        session_id = _create_completed_session("enterprise")
        resp = client.post("/report/generate", json={"session_id": session_id})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"

    def test_generate_fails_for_active_session(self) -> None:
        resp = client.post("/questionnaire/start", json={
            "user_id": "user-report-active", "track": "hni"
        })
        session_id = resp.json()["session_id"]
        resp = client.post("/report/generate", json={"session_id": session_id})
        assert resp.status_code == 400

    def test_get_report_status(self) -> None:
        session_id = _create_completed_session("hni")
        resp = client.post("/report/generate", json={"session_id": session_id})
        report_id = resp.json()["report_id"]
        resp = client.get(f"/report/{report_id}/status")
        assert resp.status_code == 200
        assert resp.json()["progress"] == 100

    def test_get_free_summary(self) -> None:
        session_id = _create_completed_session("hni")
        resp = client.post("/report/generate", json={"session_id": session_id})
        report_id = resp.json()["report_id"]
        resp = client.get(f"/report/{report_id}/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "urgency_score" in data
        assert "findings_preview" in data

    def test_full_report_requires_payment(self) -> None:
        session_id = _create_completed_session("hni")
        resp = client.post("/report/generate", json={"session_id": session_id})
        report_id = resp.json()["report_id"]
        resp = client.get(f"/report/{report_id}/full")
        assert resp.status_code == 402

    def test_full_report_with_unlock(self) -> None:
        session_id = _create_completed_session("hni")
        resp = client.post("/report/generate", json={"session_id": session_id})
        report_id = resp.json()["report_id"]
        resp = client.get(f"/report/{report_id}/full?unlocked=true")
        assert resp.status_code == 200
        data = resp.json()
        assert "radar_scores" in data
        assert "findings_by_severity" in data

    def test_idempotent_report_generation(self) -> None:
        session_id = _create_completed_session("hni")
        resp1 = client.post("/report/generate", json={"session_id": session_id})
        resp2 = client.post("/report/generate", json={"session_id": session_id})
        assert resp1.json()["report_id"] == resp2.json()["report_id"]


class TestEnterpriseReportStructure:
    def test_enterprise_has_compliance_section(self) -> None:
        session_id = _create_completed_session("enterprise")
        resp = client.post("/report/generate", json={"session_id": session_id})
        report_id = resp.json()["report_id"]
        resp = client.get(f"/report/{report_id}/full?unlocked=true")
        data = resp.json()
        assert "compliance_gap_analysis" in data
        assert "board_executive_summary" in data

    def test_enterprise_free_summary_has_compliance_gaps(self) -> None:
        session_id = _create_completed_session("enterprise")
        resp = client.post("/report/generate", json={"session_id": session_id})
        report_id = resp.json()["report_id"]
        resp = client.get(f"/report/{report_id}/summary")
        data = resp.json()
        assert "compliance_gap_count" in data
