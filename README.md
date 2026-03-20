# Pulse v2 (Pv2)

AI-powered pre-sale platform for Schell Brothers, built on the HBx platform.

## Architecture

- **Frontend:** Next.js (Vercel)
- **Data:** Supabase Postgres
- **Agent Control:** OpenClaw + NemoClaw (Mac Mini / Mission Control)
- **Inference:** Nemotron / Llama / Qwen on DGX Spark (local, fenced)

## Structure

```
apps/
  web/          # Next.js frontend (Vercel-deployed)
packages/
  database/     # Supabase schema, types, migrations
  shared/       # Shared TypeScript types and utilities
supabase/
  migrations/   # SQL migration files
docs/           # Architecture docs
```

## Development

```bash
# Install dependencies
npm install

# Start local dev
npm run dev
```

## Deployment

Connected to Vercel via GitHub. Push to `main` deploys automatically.

---
*Built by Schellie 🦞 — HBx AI Factory*
