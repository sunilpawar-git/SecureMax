"""
API key authentication middleware for FastAPI.
Protects all endpoints except /health from unauthorized external access.
The Next.js proxy sends X-Service-Key; direct external access is blocked.

Fail-closed by default: if AI_SERVICE_KEY is not set, all non-public requests
are rejected unless ALLOW_INSECURE_LOCAL=true (development only).
"""

import logging
import os
from collections.abc import Awaitable, Callable

from fastapi import Request
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

SERVICE_KEY = os.environ.get("AI_SERVICE_KEY", "")
ALLOW_INSECURE_LOCAL = os.environ.get("ALLOW_INSECURE_LOCAL", "").lower() == "true"

PUBLIC_PATHS = {"/health"}


class ServiceAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        if not SERVICE_KEY:
            if ALLOW_INSECURE_LOCAL:
                logger.warning(
                    "AI_SERVICE_KEY not set — running insecure (ALLOW_INSECURE_LOCAL=true)"
                )
                return await call_next(request)
            return JSONResponse(
                status_code=403,
                content={"detail": "Service key not configured"},
            )

        provided_key = request.headers.get("X-Service-Key", "")
        if provided_key != SERVICE_KEY:
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid or missing service key"},
            )

        return await call_next(request)
