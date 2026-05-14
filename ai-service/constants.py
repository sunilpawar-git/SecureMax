"""
SSOT for string constants used across the AI service.
Eliminates magic strings in routers, repositories, and tests.
"""

# Session statuses — must match Prisma schema defaults
SESSION_IN_PROGRESS = "in_progress"
SESSION_COMPLETED = "completed"
SESSION_ABANDONED = "abandoned"

# DB table names
TABLE_AUDIT_SESSIONS = "audit_sessions"
TABLE_SESSION_EVENTS = "session_events"

# HTTP error messages
ERR_SESSION_NOT_FOUND = "Session not found"
ERR_SESSION_ALREADY_COMPLETED = "Session already completed"
ERR_SESSION_ABANDONED = "Session was abandoned"
ERR_SESSION_ALREADY_EXISTS = "Active session already exists. Resume or abandon it first."
ERR_WRONG_QUESTION = "Expected answer for {expected}, got {got}"
ERR_NODE_NOT_IN_GRAPH = "Current node not in graph"
ERR_ACCESS_DENIED = "Access denied"
ERR_REPORT_NOT_FOUND = "Report not found"
ERR_REPORT_STILL_GENERATING = "Report still generating"
ERR_PAYMENT_REQUIRED = "Payment required to access full report"
ERR_SESSION_NOT_COMPLETED = "Session not yet completed"

# Crypto
HKDF_SALT = b"raivan-global-v1"
HKDF_INFO = b"aes-256-gcm-encryption"
