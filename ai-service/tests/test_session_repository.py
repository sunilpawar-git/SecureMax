"""
Tests for session_repository — CRUD against a real test DB.
Each test uses truncated tables for isolation.
"""

import session_repository as repo
from constants import SESSION_ABANDONED, SESSION_COMPLETED, SESSION_IN_PROGRESS
from crypto import decrypt, derive_key, encrypt
from tests.conftest import run_db

_TEST_ENC_KEY = derive_key("test-encryption-key-for-ci")
_USER_A = "user-a-test"
_USER_B = "user-b-test"
_TRACK = "hni"


class TestSessionCRUD:
    def test_create_session(self, db_conn):
        sid = run_db(repo.create_session(db_conn, _USER_A, _TRACK))
        assert sid
        session = run_db(repo.get_session(db_conn, sid))
        assert session is not None
        assert session["user_id"] == _USER_A
        assert session["track"] == _TRACK
        assert session["status"] == SESSION_IN_PROGRESS

    def test_get_session_not_found(self, db_conn):
        result = run_db(repo.get_session(db_conn, "nonexistent-id"))
        assert result is None

    def test_get_active_session(self, db_conn):
        run_db(repo.create_session(db_conn, _USER_A, _TRACK))
        active = run_db(repo.get_active_session(db_conn, _USER_A))
        assert active is not None
        assert active["user_id"] == _USER_A
        assert active["status"] == SESSION_IN_PROGRESS

    def test_record_event_and_decrypt(self, db_conn):
        sid = run_db(repo.create_session(db_conn, _USER_A, _TRACK))
        run_db(repo.set_current_node(db_conn, sid, "q1"))

        plaintext = "My answer about physical security"
        encrypted = encrypt(plaintext, _TEST_ENC_KEY)

        run_db(
            repo.record_event(
                db_conn,
                session_id=sid,
                question_id="q1",
                answer_encrypted=encrypted,
                domain="CPP-01",
                domain_score_delta={
                    "domain": "CPP-01",
                    "score_drop_trigger": False,
                },
            )
        )

        events = run_db(repo.get_events(db_conn, sid))
        assert len(events) == 1
        decrypted = decrypt(events[0]["answer_encrypted"], _TEST_ENC_KEY)
        assert decrypted == plaintext

    def test_complete_session(self, db_conn):
        sid = run_db(repo.create_session(db_conn, _USER_A, _TRACK))
        run_db(repo.complete_session(db_conn, sid))
        session = run_db(repo.get_session(db_conn, sid))
        assert session["status"] == SESSION_COMPLETED

    def test_abandon_session(self, db_conn):
        sid = run_db(repo.create_session(db_conn, _USER_A, _TRACK))
        run_db(repo.abandon_session(db_conn, sid))
        session = run_db(repo.get_session(db_conn, sid))
        assert session["status"] == SESSION_ABANDONED

    def test_get_events_empty(self, db_conn):
        sid = run_db(repo.create_session(db_conn, _USER_A, _TRACK))
        events = run_db(repo.get_events(db_conn, sid))
        assert events == []

    def test_concurrent_session_isolation(self, db_conn):
        sid_a = run_db(repo.create_session(db_conn, _USER_A, _TRACK))
        sid_b = run_db(repo.create_session(db_conn, _USER_B, _TRACK))

        encrypted_a = encrypt("answer A", _TEST_ENC_KEY)
        encrypted_b = encrypt("answer B", _TEST_ENC_KEY)

        run_db(repo.set_current_node(db_conn, sid_a, "q1"))
        run_db(repo.set_current_node(db_conn, sid_b, "q2"))

        run_db(
            repo.record_event(
                db_conn,
                session_id=sid_a,
                question_id="q1",
                answer_encrypted=encrypted_a,
                domain="CPP-01",
            )
        )
        run_db(
            repo.record_event(
                db_conn,
                session_id=sid_b,
                question_id="q2",
                answer_encrypted=encrypted_b,
                domain="CPP-02",
            )
        )

        events_a = run_db(repo.get_events(db_conn, sid_a))
        events_b = run_db(repo.get_events(db_conn, sid_b))

        assert len(events_a) == 1
        assert len(events_b) == 1
        assert events_a[0]["question_node_id"] == "q1"
        assert events_b[0]["question_node_id"] == "q2"
