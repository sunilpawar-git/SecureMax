"""
Seeds cpp_chunks table from CPP Seven Precis PDF files.
Pipeline: PDF → text extraction → semantic chunking → Gemini embedding → pgvector insert.
Idempotent: skips already-embedded chunks via content_hash.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from chunker import chunk_document  # noqa: E402
from config import get_settings  # noqa: E402

PDF_DIR = Path(__file__).resolve().parent.parent.parent / "cpp-pdfs"

DOMAIN_FILE_MAP = {
    "CPP-01": "cpp-01-physical-security.pdf",
    "CPP-02": "cpp-02-business-principles.pdf",
    "CPP-03": "cpp-03-crisis-management.pdf",
    "CPP-04": "cpp-04-investigations.pdf",
    "CPP-05": "cpp-05-information-security.pdf",
    "CPP-06": "cpp-06-personnel-security.pdf",
    "CPP-07": "cpp-07-security-management.pdf",
}


def extract_text_from_pdf(filepath: Path) -> str:
    """Extract text from PDF using PyMuPDF."""
    try:
        import fitz
    except ImportError as err:
        print("PyMuPDF (fitz) not installed — cannot extract PDF text")
        raise SystemExit(1) from err

    doc = fitz.open(str(filepath))
    text_parts: list[str] = []
    for page in doc:
        text_parts.append(page.get_text())
    doc.close()
    return "\n".join(text_parts)


async def embed_chunks(chunks: list[dict], settings: "Settings") -> list[dict]:  # noqa: F821
    """Generate embeddings via Gemini embedding model with retry logic."""
    try:
        from google import genai
    except ImportError:
        print("google-genai not installed — skipping embedding generation")
        return chunks

    import time

    client = genai.Client(api_key=settings.gemini_api_key)

    # Use the latest available embedding model
    embedding_models = [
        "models/gemini-embedding-2",
        "models/gemini-embedding-001",
    ]

    model_to_use = None
    for model_name in embedding_models:
        try:
            result = client.models.embed_content(
                model=model_name,
                contents="test",
            )
            model_to_use = model_name
            print(f"✓ Using embedding model: {model_name}")
            break
        except Exception as e:
            print(f"  {model_name} failed: {e}")
            continue

    if not model_to_use:
        print("ERROR: No embedding model available.")
        raise SystemExit(1)

    # Embed chunks with retry logic
    max_retries = 3
    for i, chunk in enumerate(chunks):
        retries = 0
        while retries < max_retries:
            try:
                result = client.models.embed_content(
                    model=model_to_use,
                    contents=chunk["chunk_text"],
                )
                chunk["embedding"] = result.embeddings[0].values
                if (i + 1) % 50 == 0:
                    print(f"  ✓ Embedded {i + 1}/{len(chunks)} chunks...")
                break
            except Exception as e:
                retries += 1
                if retries >= max_retries:
                    print(f"ERROR embedding chunk {i}: {e}")
                    raise
                wait_time = 2**retries  # exponential backoff: 2s, 4s, 8s
                print(f"  Retrying chunk {i} after {wait_time}s (attempt {retries}/{max_retries})")
                time.sleep(wait_time)

    return chunks


async def seed_to_db(chunks: list[dict], settings: "Settings") -> None:  # noqa: F821
    """Insert embedded chunks into cpp_chunks table."""
    try:
        import asyncpg
    except ImportError:
        print("asyncpg not installed — skipping DB seed")
        return

    url = settings.database_url
    if not url:
        print("DATABASE_URL not set — skipping DB seed")
        return

    # Remove connection string parameters that asyncpg doesn't understand
    url = url.replace("+asyncpg", "").split("?")[0]
    conn = await asyncpg.connect(url)
    try:
        inserted = 0
        skipped = 0
        for chunk in chunks:
            existing = await conn.fetchval(
                "SELECT id FROM cpp_chunks WHERE content_hash = $1",
                chunk["content_hash"],
            )
            if existing:
                skipped += 1
                continue

            embedding = chunk.get("embedding")
            if not embedding:
                print(f"  SKIP (no embedding): {chunk['section'][:40]}...")
                skipped += 1
                continue

            embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"
            await conn.execute(
                """
                INSERT INTO cpp_chunks
                    (id, domain, section, chunk_text, embedding, content_hash, created_at)
                VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, $5, NOW())
                """,
                chunk["domain"],
                chunk["section"],
                chunk["chunk_text"],
                embedding_str,
                chunk["content_hash"],
            )
            inserted += 1

        print(f"Inserted {inserted} chunks, skipped {skipped} (already exist or no embedding)")
    finally:
        await conn.close()


async def main() -> None:
    settings = get_settings()

    if not PDF_DIR.exists():
        print(f"PDF directory not found: {PDF_DIR}")
        print("Place CPP PDF files in the cpp-pdfs/ directory and re-run.")
        print("Expected files:")
        for domain, filename in DOMAIN_FILE_MAP.items():
            print(f"  {domain}: {filename}")
        return

    all_chunks: list[dict] = []
    for domain, filename in DOMAIN_FILE_MAP.items():
        filepath = PDF_DIR / filename
        if not filepath.exists():
            print(f"  MISSING: {filepath}")
            continue

        print(f"Processing {domain}: {filename}")
        text = extract_text_from_pdf(filepath)
        chunks = chunk_document(text, domain)
        print(f"  {len(chunks)} chunks generated")
        all_chunks.extend(chunks)

    if not all_chunks:
        print("No chunks generated — check PDF files")
        return

    print(f"\nTotal chunks: {len(all_chunks)}")

    if "--dry-run" not in sys.argv:
        all_chunks = await embed_chunks(all_chunks, settings)
        await seed_to_db(all_chunks, settings)
    else:
        print("Dry run — skipping embedding and DB seed")


if __name__ == "__main__":
    asyncio.run(main())
