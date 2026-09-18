# Leads Inbox — Production-Grade (Supabase + Express + Vite)

Replaces Google Sheets with a full web app where each lead appears as a **box (card)** grouped by **date & time**. Clicking a box opens a drawer with all fields: `Date, Status, Source, Country, Title, Link, Matched Keyword, Snippet`.

## Stack
- **DB**: Supabase (Postgres + RLS) — Project `urwdxfrgsbrbmeuwtyrx` in `ap-south-1`
- **Backend**: Express (`server/index.js`) with Supabase service_role
- **Frontend**: Vite + React + React Router (`/leads`) — box grid + detail drawer
- **n8n**: `Filter & Tag Leads` → `Aggregate` → `POST /api/leads/ingest` → Supabase

## Supabase Table `public.leads`
```sql
id uuid PK default gen_random_uuid()
date timestamptz not null default now()           -- your old "Date"
status text not null default 'New'                -- New | Contacted | Qualified | Closed | Archived
source text not null                              -- Reddit | HackerNews | RemoteOK ...
country text not null default 'Foreign'           -- Indian | Foreign | Unknown
title text not null
link text not null unique                         -- dedup key
matched_keyword text
snippet text
created_at timestamptz not null
updated_at timestamptz not null (trigger)
indexes: date desc, source, country, status, pg_trgm on title
RLS: policy "Allow all for anon and service" (for all)
```
Already created via Management API. Connection tested with service_role key.

## API (Production-Grade)
- `GET /api/health` — health
- `GET /api/leads?search=&source=&country=&status=&sort=desc&page=1&limit=24&dateFrom=&dateTo=` — paginated list + filters, search via `ilike` on title/snippet/link/matched_keyword
- `GET /api/leads/stats` — totals, by status/country, bySource
- `GET /api/leads/meta` — distinct sources/countries
- `GET /api/leads/:id` — single
- `PATCH /api/leads/:id` `{status}` — update status (optimistic UI)
- `DELETE /api/leads/:id` — delete
- `POST /api/leads` — single lead (manual)
- `POST /api/leads/ingest` — **primary webhook for n8n** — accepts `{leads:[]}` or array or single object, accepts both sheet keys (`Title`, `Link`, `Matched Keyword`, `Snippet`) and API keys (`title`, `link`...), dedupes by `link` (existing links are skipped, not overwritten), batch inserts in 50 chunks, returns `{received, inserted, skipped, duplicates}`
- `POST /api/leads/bulk` — bulk delete/archive
- Rate limiting: 120/min GET, 60/min POST per IP (in-memory; use Redis in scale)
- Security headers: nosniff, DENY, strict-origin
- Validation: normalizeLead(), URL validation, sanitizeString(), check status/country enum

## Frontend `/leads` — Box UI
Route: `http://localhost:5173/leads` (dev) or `https://YOUR_DOMAIN/leads` (prod)

**Grid**: 3 cols desktop / 2 tablet / 1 mobile. Grouped by date header `Today / Yesterday / 2026-09-17` with count. Each box shows:
- `time-chip` with `formatRelative` + `toLocaleTimeString` (e.g. "2h ago • 15:41")
- `status-dot` (New = green, Contacted = blue, etc.)
- `title` (2-line clamp)
- `badges`: source (color coded: Reddit #FF4500, HN #FF6600, RemoteOK #0ea...), country (Foreign/Indian), matched_keyword
- `snippet` (2-line clamp)
- `link hostname` + "Click to view →"

**Click → Drawer** (right slide):
- Kicker with full date `18 Sep 2026, 03:41 PM • 2h ago`
- Title, badges row
- Detail grid: Link (copy + open), Matched Keyword, Status dropdown (live PATCH), Source, Country, Date ISO, Snippet full (pre-wrap), Lead ID mono
- Actions: Open Original, Copy Link, Mark Contacted, Delete (confirm), Archive
- Hint box explaining ingestion: `POST /api/leads/ingest` every 6h, dedup by `Link`

**Filters bar**: search (debounced 400ms), source select, country select, status select, sort (newest/oldest)
**Stats bar**: Total, New, Contacted, Indian, Foreign, "total • X dates"
**States**: skeleton loaders, empty state with "Clear filters", error banner with Retry, pagination prev/next, toast notifications, keyboard Enter to open drawer, overlay click to close.

## n8n Migration
Old: `Every 6 Hours` → 11 HTTP fetches (Reddit/HN/Job Boards) → `Filter & Tag Leads` → `Append Lead to Google Sheet`

New: Replace last node. See `docs/N8N_MIGRATION.json`:
- Option A (bulk, recommended): `Filter & Tag Leads` → Code node `Aggregate Leads for Bulk Ingest` (collects `items.map(i=>i.json)` into `{leads: [...]}`) → HTTP Request `POST https://YOUR_DOMAIN/api/leads/ingest` with JSON `={{ $json }}`
- Option B (per-lead): Direct HTTP Request `POST https://YOUR_DOMAIN/api/leads` per item, body mapping Title→title etc.

Test locally: `POST http://localhost:4000/api/leads/ingest` with sample payload — already tested, inserts 8, dedup on re-ingest returns skipped:1.

## Running Locally
```bash
# server
cd server
cp .env.example .env   # already has SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, PORT=4000
npm install
npm run dev   # nodemon -> http://localhost:4000

# client (another terminal)
cd client
npm install
npm run dev     # vite -> http://localhost:5173, proxy /api -> 4000
# open http://localhost:5173/leads
```

Production build:
```bash
npm --prefix client run build   # -> client/dist
NODE_ENV=production node server/index.js   # serves dist + API on same port
```

## Env Vars (server/.env)
```
SUPABASE_URL=https://urwdxfrgsbrbmeuwtyrx.supabase.co
SUPABASE_ANON_KEY=eyJ... (anon)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role)
PORT=4000
LEADS_WEBHOOK_SECRET=   # optional: if set, n8n must send header X-Webhook-Secret
```

## Deployment (Vercel / Railway / Render)
- Host `server` as Node service, set env vars
- Host `client` as static (Vercel) OR use server to serve `client/dist` in production (already configured: `if production => express.static(../client/dist) + fallback to index.html` except `/api/*`)
- Update n8n HTTP node URL to deployed domain: `https://YOUR_DOMAIN/api/leads/ingest`
- Add `LEADS_WEBHOOK_SECRET` and add header in n8n for protection

## Security & Production Checklist
- [x] RLS enabled, policy "Allow all" — tighten later to `auth.uid()` if you add Supabase Auth (recommended: add `user_id` column + RLS `auth.uid() = user_id`)
- [x] Input sanitization + URL validation + enum checks
- [x] Dedup by unique `link` index
- [x] Rate limiting (in-memory)
- [x] CORS, security headers, body limit 1mb, batch chunking
- [ ] Add Supabase Auth for admin login (protect /leads with session)
- [ ] Add Sentry / logging for ingestion errors
- [ ] Add Redis for rate limit + queue if volume > 1000/day
- [ ] Add pg_cron or n8n schedule verification (already 6h)
- [ ] Backup: Supabase daily PITR (enable in dashboard)

## What You Get vs Sheets
- Sheets = flat table, slow, no dedup, no filters speed
- Web app = boxes grouped by date, instant search/filters, status workflow (New → Contacted → Qualified → Closed), copy/open link, delete/archive, stats, dedup guarantee, API for automations

Already seeded with 8 production-like leads for demo. New n8n runs will append new boxes with current timestamp automatically.

## Next Steps For You
1. `npm run dev` in both server/client and open `/leads`
2. In n8n, replace Sheets node with HTTP Request -> your deployed `/api/leads/ingest`
3. Deploy server + client and update n8n URL
4. (Optional) Add auth: I can wire Supabase Auth + protected /leads route next
