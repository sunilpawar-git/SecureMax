"""
Async DB repository for user profile write-backs from the questionnaire.
Pure data access — no business logic.
"""

import asyncpg

from constants import TABLE_USERS

# Allowlist: the question graph YAML can request a write via
# `writes_to_profile_field`, but it never controls which SQL column is
# touched — only these two columns are reachable.
_PROFILE_FIELD_COLUMNS = {"city": "city", "country": "country"}

# Matches the Zod cap on the same columns in src/app/api/user/profile/route.ts —
# keeps the two write paths (PATCH /api/user/profile, this write-back) consistent.
_MAX_FIELD_LENGTH = 100


async def update_profile_field(
    conn: asyncpg.Connection,
    user_id: str,
    field: str,
    value: str,
) -> None:
    """Write a questionnaire answer back to the user's profile.

    `field` must be one of the allowlisted keys ("city", "country") — raises
    ValueError otherwise rather than silently touching an arbitrary column.
    """
    column = _PROFILE_FIELD_COLUMNS.get(field)
    if column is None:
        raise ValueError(f"Unsupported profile field write-back: {field}")
    if not value or len(value) > _MAX_FIELD_LENGTH:
        raise ValueError(f"Invalid {field} length for profile write-back")
    # app_user's grant on `users` is column-scoped to city/country only (see
    # prisma/migrations/14_grant_app_user_city_country) — touching any other
    # column, including updated_at, fails with permission denied.
    await conn.execute(
        f"UPDATE {TABLE_USERS} SET {column} = $1 WHERE id = $2",  # noqa: S608
        value,
        user_id,
    )
