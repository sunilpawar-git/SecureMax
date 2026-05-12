# Raivan Global — Security Crawler

AI-driven physical security audit SaaS for HNIs and enterprises.

## Quick Start

```bash
# Start infrastructure
docker-compose up -d postgres

# Next.js frontend (port 3000)
npm install
cp .env.example .env
npm run dev

# FastAPI AI service (port 8000)
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Test

```bash
# Frontend tests
npm test

# AI service tests
cd ai-service && source .venv/bin/activate && pytest
```

## Architecture

- **Frontend**: Next.js 14 (App Router, TypeScript, Tailwind)
- **AI Service**: Python FastAPI (Gemini API, pgvector)
- **Database**: PostgreSQL + pgvector
- **Auth**: NextAuth.js (Google + Microsoft + OIDC)
