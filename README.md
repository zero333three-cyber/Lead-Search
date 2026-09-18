# Lead-Search — Clean Leads Dashboard

Standalone production dashboard for your n8n `Agency Lead Finder` workflow. No portfolio, no extra UI — just clean boxes.

- Each n8n run creates **boxes** grouped by **date** with timestamp
- Click any box → **modal** with full details: `Title, Link, Matched Keyword, Snippet, Source, Country, Status, Date`
- Filters, search, pagination, status workflow, dedup by `Link`

## Live
- App: `https://leadsearchcheck.vercel.app` → open `/` to see dashboard
- API: `/api/health`, `/api/leads`, `/api/leads/stats`, `POST /api/leads/ingest`

## Stack
- Supabase `urwdxfrgsbrbmeuwtyrx` (ap-south-1) table `public.leads`
- Express `server/` + `api/index.js` (Vercel serverless)
- Vite React `client/` — clean, minimal UI

## Run Local
```bash
npm install && npm --prefix client install && npm --prefix server install
# set server/.env — see server/.env.example
npm run dev # client 5173 + server 4000
```

## Vercel Deploy
Build: `npm --prefix client run build` → `client/dist`
Env (Vercel → Settings → Environment Variables):
```
SUPABASE_URL=https://urwdxfrgsbrbmeuwtyrx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## n8n Setup
Delete `Append Lead to Google Sheet` → add `Aggregate` Code + `HTTP Request POST https://YOUR_DOMAIN/api/leads/ingest` with body `{{ $json }}` containing `{leads:[...]}`. Server accepts both Sheet keys (`Title/Link`) and dedupes by `Link`.
