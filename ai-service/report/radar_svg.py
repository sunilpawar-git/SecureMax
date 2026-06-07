"""
Inline SVG radar chart generator for audit reports.
Pure function: dict[str, float] → SVG string. No external dependencies.
Renders a heptagonal chart with CPP domain scores.
"""

import math

from config import CPP_DOMAINS
from report.constants import RADAR_COLORS, RADAR_THRESHOLD_HIGH, RADAR_THRESHOLD_MEDIUM

_DOMAIN_SHORT_NAMES = {
    "CPP-01": "Physical",
    "CPP-02": "Business",
    "CPP-03": "Crisis",
    "CPP-04": "Investigations",
    "CPP-05": "InfoSec",
    "CPP-06": "Personnel",
    "CPP-07": "Management",
}

_DEFAULT_SIZE = 400
_LABEL_OFFSET = 25


def generate_radar_svg(scores: dict[str, float], size: int = _DEFAULT_SIZE) -> str:
    """Generate an inline SVG heptagonal radar chart from CPP domain scores."""
    domains = list(CPP_DOMAINS.keys())
    n = len(domains)
    cx = size / 2
    cy = size / 2
    radius = (size / 2) - 60

    angle_step = 2 * math.pi / n
    start_offset = -math.pi / 2

    grid_rings = _build_grid_rings(cx, cy, radius, n, angle_step, start_offset)
    axis_lines = _build_axis_lines(cx, cy, radius, n, angle_step, start_offset)
    data_polygon = _build_data_polygon(scores, domains, cx, cy, radius, n, angle_step, start_offset)
    labels = _build_labels(scores, domains, cx, cy, radius, n, angle_step, start_offset)

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{size}" height="{size}" viewBox="0 0 {size} {size}">\n'
        f"  {grid_rings}\n"
        f"  {axis_lines}\n"
        f"  {data_polygon}\n"
        f"  {labels}\n"
        f"</svg>"
    )


def _build_grid_rings(
    cx: float,
    cy: float,
    radius: float,
    n: int,
    angle_step: float,
    start_offset: float,
) -> str:
    """Concentric guide polygons at 25%, 50%, 75%, 100%."""
    rings = []
    for pct in (0.25, 0.5, 0.75, 1.0):
        r = radius * pct
        points = _polygon_points(cx, cy, r, n, angle_step, start_offset)
        opacity = "0.3" if pct < 1.0 else "0.5"
        rings.append(
            f'<polygon points="{points}" fill="none" '
            f'stroke="#CBD5E1" stroke-width="1" opacity="{opacity}"/>'
        )
    return "\n  ".join(rings)


def _build_axis_lines(
    cx: float,
    cy: float,
    radius: float,
    n: int,
    angle_step: float,
    start_offset: float,
) -> str:
    """Lines from center to each vertex."""
    lines = []
    for i in range(n):
        angle = start_offset + i * angle_step
        x = cx + radius * math.cos(angle)
        y = cy + radius * math.sin(angle)
        lines.append(
            f'<line x1="{cx:.1f}" y1="{cy:.1f}" x2="{x:.1f}" y2="{y:.1f}" '
            f'stroke="#CBD5E1" stroke-width="0.5"/>'
        )
    return "\n  ".join(lines)


def _build_data_polygon(
    scores: dict[str, float],
    domains: list[str],
    cx: float,
    cy: float,
    radius: float,
    n: int,
    angle_step: float,
    start_offset: float,
) -> str:
    """The data shape — filled polygon proportional to scores."""
    points_list = []
    for i, domain in enumerate(domains):
        score = max(0.0, min(100.0, scores.get(domain, 0.0)))
        r = radius * (score / 100.0)
        angle = start_offset + i * angle_step
        x = cx + r * math.cos(angle)
        y = cy + r * math.sin(angle)
        points_list.append(f"{x:.1f},{y:.1f}")

    points = " ".join(points_list)
    fill = RADAR_COLORS["high"]
    return (
        f'<polygon points="{points}" '
        f'fill="{fill}" fill-opacity="0.2" '
        f'stroke="{fill}" stroke-width="2"/>'
    )


def _build_labels(
    scores: dict[str, float],
    domains: list[str],
    cx: float,
    cy: float,
    radius: float,
    n: int,
    angle_step: float,
    start_offset: float,
) -> str:
    """Domain name labels and score values at each axis tip."""
    labels = []
    for i, domain in enumerate(domains):
        angle = start_offset + i * angle_step
        label_r = radius + _LABEL_OFFSET
        x = cx + label_r * math.cos(angle)
        y = cy + label_r * math.sin(angle)

        anchor = _text_anchor(angle)
        name = _DOMAIN_SHORT_NAMES.get(domain, domain)
        score = scores.get(domain, 0.0)
        color = _score_color(score)

        labels.append(
            f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" '
            f'font-size="10" font-family="sans-serif" fill="#374151">'
            f"{name}</text>"
        )
        labels.append(
            f'<text x="{x:.1f}" y="{y + 13:.1f}" text-anchor="{anchor}" '
            f'font-size="11" font-weight="bold" font-family="sans-serif" '
            f'fill="{color}">{score:.0f}</text>'
        )
    return "\n  ".join(labels)


def _polygon_points(
    cx: float,
    cy: float,
    radius: float,
    n: int,
    angle_step: float,
    start_offset: float,
) -> str:
    """Generate space-separated polygon point coordinates."""
    pts = []
    for i in range(n):
        angle = start_offset + i * angle_step
        x = cx + radius * math.cos(angle)
        y = cy + radius * math.sin(angle)
        pts.append(f"{x:.1f},{y:.1f}")
    return " ".join(pts)


def _text_anchor(angle: float) -> str:
    """Determine SVG text-anchor based on angle position."""
    cos_val = math.cos(angle)
    if cos_val > 0.3:
        return "start"
    if cos_val < -0.3:
        return "end"
    return "middle"


def _score_color(score: float) -> str:
    """Color based on score thresholds."""
    if score >= RADAR_THRESHOLD_HIGH:
        return RADAR_COLORS["high"]
    if score >= RADAR_THRESHOLD_MEDIUM:
        return RADAR_COLORS["medium"]
    return RADAR_COLORS["low"]
