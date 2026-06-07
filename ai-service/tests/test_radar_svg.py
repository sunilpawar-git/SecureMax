"""Tests for SVG radar chart generator — pure function, no dependencies."""

import xml.etree.ElementTree as ET  # noqa: S405

from config import CPP_DOMAINS
from report.radar_svg import generate_radar_svg


def _uniform_scores(value: float) -> dict[str, float]:
    return dict.fromkeys(CPP_DOMAINS, value)


class TestRadarSvgOutput:
    def test_svg_output_is_valid_xml(self) -> None:
        scores = _uniform_scores(75.0)
        svg = generate_radar_svg(scores)
        root = ET.fromstring(svg)  # noqa: S314
        assert root.tag == "{http://www.w3.org/2000/svg}svg"

    def test_svg_contains_all_7_domains(self) -> None:
        scores = _uniform_scores(50.0)
        svg = generate_radar_svg(scores)
        expected_labels = [
            "Physical",
            "Business",
            "Crisis",
            "Investigations",
            "InfoSec",
            "Personnel",
            "Management",
        ]
        for label in expected_labels:
            assert label in svg, f"Missing label: {label}"

    def test_svg_handles_zero_scores(self) -> None:
        scores = _uniform_scores(0.0)
        svg = generate_radar_svg(scores)
        root = ET.fromstring(svg)  # noqa: S314
        assert root is not None

    def test_svg_handles_perfect_scores(self) -> None:
        scores = _uniform_scores(100.0)
        svg = generate_radar_svg(scores)
        root = ET.fromstring(svg)  # noqa: S314
        assert root is not None

    def test_svg_size_parameter(self) -> None:
        scores = _uniform_scores(60.0)
        svg = generate_radar_svg(scores, size=500)
        root = ET.fromstring(svg)  # noqa: S314
        assert root.get("width") == "500"
        assert root.get("height") == "500"

    def test_svg_default_size(self) -> None:
        scores = _uniform_scores(60.0)
        svg = generate_radar_svg(scores)
        root = ET.fromstring(svg)  # noqa: S314
        assert root.get("width") == "400"

    def test_svg_contains_polygon_elements(self) -> None:
        scores = _uniform_scores(80.0)
        svg = generate_radar_svg(scores)
        assert "polygon" in svg

    def test_svg_contains_score_labels(self) -> None:
        scores = {"CPP-01": 45.0, **{d: 80.0 for d in CPP_DOMAINS if d != "CPP-01"}}
        svg = generate_radar_svg(scores)
        assert "45" in svg

    def test_svg_partial_scores(self) -> None:
        scores = {
            "CPP-01": 20.0,
            "CPP-02": 95.0,
            "CPP-03": 60.0,
            "CPP-04": 40.0,
            "CPP-05": 0.0,
            "CPP-06": 100.0,
            "CPP-07": 55.0,
        }
        svg = generate_radar_svg(scores)
        root = ET.fromstring(svg)  # noqa: S314
        assert root is not None
