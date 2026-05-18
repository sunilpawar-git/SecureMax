"""
API key authentication middleware for FastAPI.
Protects all endpoints except /health from unauthorized external access.
The Next.js proxy sends X-Service-Key; direct external access is blocked.

Fail-closed by default: if AI_SERVICE_KEY is not set, all non-public requests
are rejected unless ALLOW_INSECURE_LOCAL=true (development only).

Environment variables are read at request time (not import time) so that
test fixtures can override them.
"""

import hmac
import logging
import os
from collections.abc import Awaitable, Callable

from fastapi import Request
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

PUBLIC_PATHS = {"/health"}


def _allow_insecure() -> bool:
    """Check ALLOW_INSECURE_LOCAL from .env via pydantic, with os.environ fallback."""
    try:
        from config import get_settings

        return get_settings().allow_insecure_local
    except Exception:
        return os.environ.get("ALLOW_INSECURE_LOCAL", "").lower() == "true"


class ServiceAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        service_key = os.environ.get("AI_SERVICE_KEY", "")

        if not service_key:
            if _allow_insecure():
                return await call_next(request)
            return JSONResponse(
                status_code=403,
                content={"detail": "Service key not configured"},
            )

        provided_key = request.headers.get("X-Service-Key", "")
        if not hmac.compare_digest(provided_key, service_key):
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid or missing service key"},
            )

        return await call_next(request)
