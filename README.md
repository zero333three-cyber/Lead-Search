# Lead-Search — Production Leads Inbox (Supabase + Vercel)

Production-grade replacement for Google Sheets. Every lead from your n8n workflow appears as a **box** grouped by date/time. Click any box to view full details (Title, Link, Matched Keyword, Snippet, Source, Country, Status).

## Live
- App: https://lead-search.vercel.app (after deploy)
- API: `https://lead-search.vercel.app/api/leads` (health: `/api/health`)

## Stack
- Supabase (Project `urwdxfrgsbrbmeuwtyrx` ap-south-1) ? `public.leads` with RLS, unique `link`, indexes
- Express API (`server/index.js` + `api/index.js` for Vercel serverless) — CRUD + `POST /api/leads/ingest` dedup
- Vite React (`client`) — /leads inbox: box grid, drawer, filters, pagination, status workflow
- n8n: 11 sources ? Filter & Tag Leads ? Aggregate ? POST /api/leads/ingest

## Quick Start Local
```bash
npm install && npm --prefix client install && npm --prefix server install
# set server/.env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm run dev  # client @5173 + server @4000
# open http://localhost:5173/leads
```

## Vercel Deploy
Build: `npm --prefix client run build` ? `client/dist`
Env vars (Vercel Dashboard ? Settings ? Environment Variables):
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- LEADS_WEBHOOK_SECRET (optional)

## n8n Migration
Delete `Append Lead to Google Sheet` node, add Code `Aggregate Leads for Bulk Ingest` + HTTP Request `POST https://YOUR_DOMAIN/api/leads/ingest` with body `={{ $json }}` containing `{leads:[...]}`. See `docs/N8N_MIGRATION.json`.

## Docs
- `docs/LEADS_PRODUCTION_README.md` — full API + DB + deployment guide
- `docs/N8N_MIGRATION.json` — nodes to import
