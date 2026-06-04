"""
Seeds cpp_chunks table from CPP Seven Precis Markdown files (synchronous version).
Pipeline: MD → text extraction → semantic chunking → Gemini embedding → pgvector insert.
"""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from chunker import chunk_document  # noqa: E402
from config import get_settings  # noqa: E402

PDF_DIR = Path(__file__).resolve().parent.parent.parent / "cpp-pdfs"

DOMAIN_FILE_MAP = {
    "CPP-01": "01. POA Physical Security-2021.md",
    "CPP-02": "02. PAO Business Principles.md",
    "CPP-03": "03 POA CRISIS MANAGEMENT.md",
    "CPP-04": "04 PoA Investigations.md",
    "CPP-05": "05 Information Security POA.md",
    "CPP-06": "06 Personnel PoA.md",
    "CPP-07": "07 PoA Security Management.md",
}


def extract_text_from_markdown(filepath: Path) -> str:
    """Extract text from markdown file."""
    try:
        with open(filepath, encoding="utf-8") as f:
            return f.read()
    except Exception as err:
        print(f"Error reading markdown file {filepath}: {err}")
        raise SystemExit(1) from err


def embed_and_insert_chunks(chunks: list[dict], settings: "Settings") -> None:  # noqa: F821
    """Embed chunks and insert to DB synchronously."""
    try:
        from google import genai
    except ImportError:
        print("google-genai not installed")
        raise SystemExit(1) from None

    try:
        import asyncpg
    except ImportError:
        print("asyncpg not installed")
        raise SystemExit(1) from None

    client = genai.Client(api_key=settings.gemini_api_key)

    # Test embedding model
    model_to_use = None
    for model_name in ["models/gemini-embedding-2", "models/gemini-embedding-001"]:
        try:
            client.models.embed_content(model=model_name, contents="test")
            model_to_use = model_name
            print(f"✓ Using embedding model: {model_name}\n")
            break
        except Exception as e:
            print(f"  {model_name} failed: {e}")
            continue

    if not model_to_use:
        print("ERROR: No embedding model available.")
        raise SystemExit(1)

    # Connect to DB
    import asyncio

    import asyncpg

    async def insert_chunks():
        url = settings.database_url.replace("+asyncpg", "").split("?")[0]
        conn = await asyncpg.connect(url)
        inserted = 0
        skipped = 0

        try:
            for i, chunk in enumerate(chunks):
                # Check if already exists
                existing = await conn.fetchval(
                    "SELECT id FROM cpp_chunks WHERE content_hash = $1",
                    chunk["content_hash"],
                )
                if existing:
                    skipped += 1
                    continue

                # Embed
                max_retries = 3
                retries = 0
                embedding = None
                while retries < max_retries:
                    try:
                        result = client.models.embed_content(
                            model=model_to_use,
                            contents=chunk["chunk_text"],
                        )
                        embedding = result.embeddings[0].values
                        break
                    except Exception as e:
                        retries += 1
                        if retries >= max_retries:
                            print(f"ERROR embedding chunk {i}: {e}")
                            raise
                        wait_time = 2**retries
                        print(f"  Retry chunk {i} after {wait_time}s")
                        time.sleep(wait_time)

                if not embedding:
                    skipped += 1
                    continue

                # Insert
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

                if (i + 1) % 100 == 0:
                    print(f"  ✓ Processed {i + 1}/{len(chunks)} chunks ({inserted} inserted)...")

        finally:
            await conn.close()

        print(
            f"\n✓ Inserted {inserted} chunks, skipped {skipped} (already exist or no embedding)"
        )

    asyncio.run(insert_chunks())


def main() -> None:
    settings = get_settings()

    if not PDF_DIR.exists():
        print(f"Markdown directory not found: {PDF_DIR}")
        return

    all_chunks: list[dict] = []
    for domain, filename in DOMAIN_FILE_MAP.items():
        filepath = PDF_DIR / filename
        if not filepath.exists():
            print(f"  MISSING: {filepath}")
            continue

        print(f"Processing {domain}: {filename}")
        text = extract_text_from_markdown(filepath)
        chunks = chunk_document(text, domain)
        print(f"  {len(chunks)} chunks generated")
        all_chunks.extend(chunks)

    if not all_chunks:
        print("No chunks generated")
        return

    print(f"\nTotal chunks: {len(all_chunks)}")

    if "--dry-run" not in sys.argv:
        embed_and_insert_chunks(all_chunks, settings)
    else:
        print("Dry run — skipping embedding and DB seed")


if __name__ == "__main__":
    main()
