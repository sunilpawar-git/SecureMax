"""
Severity matrix loader — reads expert-editable YAML and provides
per-question severity overrides with risk impact statements.
Falls through to keyword-based classification for unmapped questions.
Pure module: no I/O at import time; YAML loaded lazily on first call.

Cache behaviour: the matrix is loaded once and held in `_cache` for the
process lifetime. If `severity_matrix.yaml` is edited at runtime, a server
restart is required for the changes to take effect. Use `_reset_cache()`
in tests to force a reload between test cases.
"""

import re
from pathlib import Path

import yaml

from config import CPP_DOMAINS, SEVERITY_ORDER

_MATRIX_PATH = Path(__file__).parent / "config" / "severity_matrix.yaml"
_cache: dict | None = None


def load_severity_matrix(path: Path | None = None) -> dict:
    """Load and validate severity matrix from YAML. Cached after first call."""
    global _cache  # noqa: PLW0603
    if _cache is not None:
        return _cache

    file_path = path or _MATRIX_PATH
    if not file_path.exists():
        _cache = {}
        return _cache

    with open(file_path, encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}

    validate_matrix(raw)
    _cache = raw
    return _cache


def validate_matrix(matrix: dict) -> None:
    """Validate all domains and severities in the matrix are known constants."""
    for domain, questions in matrix.items():
        if domain not in CPP_DOMAINS:
            raise ValueError(
                f"Invalid domain in severity matrix: '{domain}'. Valid: {list(CPP_DOMAINS.keys())}"
            )
        if not isinstance(questions, dict):
            raise ValueError(f"Domain '{domain}' must map to a dict of questions")
        for node_id, config in questions.items():
            severity = config.get("severity_override")
            if severity not in SEVERITY_ORDER:
                raise ValueError(
                    f"Invalid severity '{severity}' for {domain}/{node_id}. Valid: {SEVERITY_ORDER}"
                )


def get_question_severity(
    domain: str,
    node_id: str,
    answer: str,
) -> tuple[str, str | None] | None:
    """Look up severity override for a specific question + answer.

    Returns (severity, risk_impact) if the answer matches a negative pattern
    in the matrix. Returns None if the question is unmapped or the answer
    does not match any negative pattern (caller should fall back to keywords).
    """
    matrix = load_severity_matrix()
    domain_config = matrix.get(domain)
    if not domain_config:
        return None

    question_config = domain_config.get(node_id)
    if not question_config:
        return None

    patterns = question_config.get("negative_patterns", [])
    answer_lower = answer.lower().strip()

    for pattern in patterns:
        pattern_lower = pattern.lower()
        if re.search(r"\b" + re.escape(pattern_lower) + r"\b", answer_lower):
            severity = question_config["severity_override"]
            risk_impact = question_config.get("risk_impact")
            return (severity, risk_impact)

    return None


def _reset_cache() -> None:
    """Test helper — clear cached matrix to force reload."""
    global _cache  # noqa: PLW0603
    _cache = None
