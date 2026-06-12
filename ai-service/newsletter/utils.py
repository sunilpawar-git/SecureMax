"""Shared utilities for the newsletter package. Defined ONCE, imported everywhere."""

from newsletter.constants import CPP_DOMAIN_LABELS

_SAFE_URL_PREFIXES = ("/", "https://")


def domain_label(code: str) -> str:
    """Translate internal CPP code to public-facing plain-English label."""
    return CPP_DOMAIN_LABELS.get(code, code)


def safe_url(link: str) -> str:
    """Validate that a URL is safe to place in an HTML href attribute.

    Accepts relative paths (starting with '/') and absolute HTTPS URLs only.
    Raises ValueError for javascript:, data:, http: or any other scheme that
    could be exploited as a stored XSS vector.
    """
    if not any(link.startswith(prefix) for prefix in _SAFE_URL_PREFIXES):
        raise ValueError(
            f"Unsafe URL in cta_audit_link: {link!r}. "
            "Only relative paths (/) and https:// are allowed."
        )
    return link
