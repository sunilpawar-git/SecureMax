# CLAUDE.md — `ai-service/tests/`

Python test suite: 26 test files covering unit, integration, and E2E.

## Rules

- **Pure unit tests** (chunker, scoring, findings, crypto): no DB, no Gemini — mock nothing, test pure functions directly
- **Gemini tests**: mock via `unittest.mock.AsyncMock` — never call real Gemini API in CI
- **DB tests**: use `test_ai` schema (created in `conftest.py`) — never touch `public` schema in tests
- **Integration tests require `@pytest.mark.integration`** — skipped in fast CI (`pytest -m "not integration"`)
- **Questionnaire tests must assert branch outcome** for a specific answer, not just that the function returns (Rule 9)
- **`asyncio_mode = "auto"`** set in `pyproject.toml` — no `@pytest.mark.asyncio` decorators needed
- **Test file naming**: `test_<module_name>.py` — mirrors the module being tested

## Test Categories

| Category | Files | DB | Gemini | Notes |
|----------|-------|----|----|-------|
| **Pure Unit** | `test_chunker.py`, `test_scoring.py`, `test_crypto_bytes.py` | None | None | No mocks; test functions in isolation |
| **Gemini Tests** | `test_branching.py`, `test_narrative.py`, `test_compliance.py` | None | Mocked | `unittest.mock.AsyncMock` |
| **DB Tests** | `test_session_repository.py`, `test_cpp_repository.py` | `test_ai` | None | Real DB schema (test-isolated) |
| **Integration** | `test_questionnaire_api.py`, `test_enterprise_pdf_e2e.py` | `test_ai` | Mocked | Full flow (marked `@pytest.mark.integration`) |

## Running Tests

```bash
# All tests
pytest

# Fast (skip integration)
pytest -m "not integration"

# Single file
pytest tests/test_questionnaire_api.py

# With coverage
pytest --cov=. tests/
```

## Common Pitfalls

1. Calling real Gemini API in tests → CI fails, slow, rate-limited
2. Testing return value exists, not behavior → misses bugs (Rule 9)
3. Using `public` schema in tests → pollutes development DB
4. Integration tests not marked → clutter in fast CI runs
5. No fixtures for common setup → duplicate code across tests
6. Testing implementation details → brittle to refactors
7. Missing `await` on async functions → hanging tests
