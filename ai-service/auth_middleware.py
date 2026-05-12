"""
API key authentication middleware for FastAPI.
Protects all endpoints except /health from unauthorized external access.
The Next.js proxy sends X-Service-Key; direct external access is blocked.
"""

import os

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

SERVICE_KEY = os.environ.get("AI_SERVICE_KEY", "")

PUBLIC_PATHS = {"/health", "/docs", "/openapi.json"}


class ServiceAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        if not SERVICE_KEY:
            return await call_next(request)

        provided_key = request.headers.get("X-Service-Key", "")
        if provided_key != SERVICE_KEY:
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid or missing service key"},
            )

        return await call_next(request)
