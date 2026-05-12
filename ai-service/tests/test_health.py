"""Tests for FastAPI health endpoint — Phase 0 verification."""

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health_endpoint_returns_200(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200


def test_health_endpoint_returns_correct_body(client: TestClient) -> None:
    response = client.get("/health")
    body = response.json()
    assert body["status"] == "healthy"
    assert body["service"] == "raivan-ai"


def test_health_endpoint_rejects_post(client: TestClient) -> None:
    response = client.post("/health")
    assert response.status_code == 405
