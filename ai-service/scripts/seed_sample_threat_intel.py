"""
Seed sample threat intelligence rows for Phase 5 testing.
Idempotent — uses ON CONFLICT DO NOTHING on url.
# TODO(phase-7): replace sample data with real scraper output.
"""

import asyncio
import hashlib
import json
import sys

import asyncpg

sys.path.insert(0, ".")
from config import get_settings

SAMPLE_ARTICLES = [
    {
        "title": "Warehouse perimeter breach exposes inventory theft ring",
        "domain_tags": ["CPP-01"],
        "industry_tags": ["logistics", "warehousing"],
        "summary": (
            "A logistics firm suffered repeated inventory losses after "
            "intruders breached an unmonitored section of perimeter fencing."
        ),
    },
    {
        "title": "CCTV blind spots exploited in corporate office break-in",
        "domain_tags": ["CPP-01", "CPP-05"],
        "industry_tags": ["corporate", "office"],
        "summary": (
            "Attackers identified camera dead zones and accessed a server "
            "room containing unencrypted backup drives."
        ),
    },
    {
        "title": "Insider threat: former employee retains access for 6 months",
        "domain_tags": ["CPP-06", "CPP-05"],
        "industry_tags": ["technology", "enterprise"],
        "summary": (
            "A terminated employee's badge and VPN credentials were not "
            "revoked, enabling data exfiltration over six months."
        ),
    },
    {
        "title": "Crisis response failure during chemical spill",
        "domain_tags": ["CPP-03"],
        "industry_tags": ["manufacturing"],
        "summary": (
            "No rehearsed evacuation plan existed. Emergency response took "
            "45 minutes longer than industry benchmarks."
        ),
    },
    {
        "title": "Security guard patrol routes predictable, enabling tailgating",
        "domain_tags": ["CPP-06", "CPP-01"],
        "industry_tags": ["residential", "hni"],
        "summary": (
            "Fixed patrol schedules allowed unauthorized persons to time "
            "entry through vehicle gates undetected."
        ),
    },
    {
        "title": "Business continuity plan untested for 3 years",
        "domain_tags": ["CPP-02", "CPP-03"],
        "industry_tags": ["finance", "enterprise"],
        "summary": (
            "When ransomware struck, the BCP was outdated and backups were "
            "corrupted, resulting in 72 hours of downtime."
        ),
    },
    {
        "title": "Investigation bungled: evidence chain of custody broken",
        "domain_tags": ["CPP-04"],
        "industry_tags": ["retail", "enterprise"],
        "summary": (
            "Internal investigation into employee theft failed in court due "
            "to improperly handled CCTV footage and access logs."
        ),
    },
    {
        "title": "Unencrypted visitor logs expose personal data of 10k guests",
        "domain_tags": ["CPP-05", "CPP-01"],
        "industry_tags": ["hospitality", "hni"],
        "summary": (
            "Paper-based visitor logs were photographed and leaked online, "
            "exposing names, phone numbers, and visit purposes."
        ),
    },
    {
        "title": "ESRM framework adoption reduces security incidents by 40%",
        "domain_tags": ["CPP-07", "CPP-02"],
        "industry_tags": ["enterprise", "corporate"],
        "summary": (
            "A multinational adopted the ESRM cycle with quarterly "
            "stakeholder reviews, cutting reportable incidents significantly."
        ),
    },
    {
        "title": "Residential estate fire response delayed by locked exits",
        "domain_tags": ["CPP-03", "CPP-01"],
        "industry_tags": ["residential", "hni"],
        "summary": (
            "Emergency exits were padlocked to prevent unauthorised entry, "
            "delaying evacuation by 12 minutes during a kitchen fire."
        ),
    },
    {
        "title": "Access control bypass via cloned RFID badges at data centre",
        "domain_tags": ["CPP-01", "CPP-05"],
        "industry_tags": ["technology", "data_centre"],
        "summary": (
            "Low-frequency RFID badges were cloned in under 30 seconds, "
            "granting unrestricted access to server racks."
        ),
    },
    {
        "title": "Security management review cycle skipped for two years",
        "domain_tags": ["CPP-07"],
        "industry_tags": ["enterprise"],
        "summary": (
            "Without annual reviews, the security policy drifted from the "
            "operating environment, leaving new risks unaddressed."
        ),
    },
]


async def seed(dsn: str) -> None:
    conn = await asyncpg.connect(dsn)
    try:
        inserted = 0
        for i, article in enumerate(SAMPLE_ARTICLES):
            content_hash = hashlib.sha256(article["title"].encode()).hexdigest()
            url = f"https://sample-threat-intel.example.com/article-{i:03d}"
            aid = f"sample-ti-{i:03d}"
            result = await conn.execute(
                """
                INSERT INTO threat_intel
                    (id, title, url, content_hash, summary,
                     domain_tags, industry_tags, source)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (url) DO NOTHING
                """,
                aid,
                article["title"],
                url,
                content_hash,
                article["summary"],
                json.dumps(article["domain_tags"]),
                json.dumps(article["industry_tags"]),
                "sample_seed",
            )
            if "INSERT" in result:
                inserted += 1
        total = len(SAMPLE_ARTICLES)
        print(
            f"Seeded {inserted} sample threat intel articles ({total} total, skipped duplicates)."
        )
    finally:
        await conn.close()


if __name__ == "__main__":
    settings = get_settings()
    dsn = settings.database_url.replace("+asyncpg", "").split("?")[0]
    asyncio.run(seed(dsn))
