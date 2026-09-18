require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { supabaseAdmin } = require('./supabase');

const app = express();
const port = process.env.PORT || 4000;

// --- Middleware ---
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Simple in-memory rate limiter (production would use Redis)
const rateMap = new Map();
app.use('/api/leads', (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'local';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = req.method === 'GET' ? 120 : 60;
  const entry = rateMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  rateMap.set(ip, entry);
  if (entry.count > max) {
    return res.status(429).json({ error: 'Too many requests, slow down.' });
  }
  next();
});

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// --- Constants & Helpers ---
const VALID_STATUSES = ['New', 'Contacted', 'Qualified', 'Closed', 'Archived'];
const VALID_COUNTRIES = ['Indian', 'Foreign', 'Unknown'];
const VALID_SOURCES = ['Reddit', 'HackerNews', 'RemoteOK', 'WeWorkRemotely', 'IndieHackers', 'RSS', 'Freelan', 'Unknown'];

function sanitizeString(v, max = 2000) {
  if (v == null) return '';
  return String(v).trim().slice(0, max);
}

function normalizeLead(raw) {
  // Supports both n8n sheet format (Date, Status, Source, Country, Title, Link, Matched Keyword, Snippet)
  // and webhook API format (date, status, source, country, title, link, matched_keyword, snippet)
  const get = (obj, ...keys) => {
    for (const k of keys) if (obj[k] != null && String(obj[k]).trim() !== '') return obj[k];
    return undefined;
  };
  const title = sanitizeString(get(raw, 'title', 'Title', 'TITLE'), 500);
  const link = sanitizeString(get(raw, 'link', 'Link', 'LINK', 'url', 'Url'), 2000);
  if (!title || !link) return null;
  let dateVal = get(raw, 'date', 'Date', 'created_at');
  let date = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(date.getTime())) date = new Date();

  const statusRaw = sanitizeString(get(raw, 'status', 'Status'), 50);
  const status = VALID_STATUSES.includes(statusRaw) ? statusRaw : 'New';

  const sourceRaw = sanitizeString(get(raw, 'source', 'Source'), 80);
  // Normalize source variations like Freelance categories -> keep original but cap length
  const source = sourceRaw ? sourceRaw.slice(0, 80) : 'Unknown';

  const countryRaw = sanitizeString(get(raw, 'country', 'Country'), 30);
  const country = VALID_COUNTRIES.includes(countryRaw) ? countryRaw : (countryRaw ? 'Foreign' : 'Unknown');

  const matched_keyword = sanitizeString(get(raw, 'matched_keyword', 'Matched Keyword', 'MatchedKeyword', 'Matched'), 300);
  const snippet = sanitizeString(get(raw, 'snippet', 'Snippet', 'content', 'description'), 5000);

  // Basic URL validation
  try { new URL(link); } catch { return null; }

  return {
    date: date.toISOString(),
    status,
    source,
    country,
    title,
    link,
    matched_keyword: matched_keyword || null,
    snippet: snippet || null,
  };
}

function applyFilters(query, { search, source, country, status, dateFrom, dateTo }) {
  if (search) {
    const term = `%${search.replace(/%/g, '\\%')}%`;
    query = query.or(`title.ilike.${term},snippet.ilike.${term},link.ilike.${term},matched_keyword.ilike.${term},source.ilike.${term}`);
  }
  if (source && source !== 'All') query = query.eq('source', source);
  if (country && country !== 'All') query = query.eq('country', country);
  if (status && status !== 'All') query = query.eq('status', status);
  if (dateFrom) query = query.gte('date', new Date(dateFrom).toISOString());
  if (dateTo) query = query.lte('date', new Date(dateTo).toISOString());
  return query;
}


// --- Leads API ---

let _statsCache = null;
let _statsAt = 0;
 // Stats - must be before /:id (parallel + cached 15s)
app.get('/api/leads/stats', async (req, res) => {
  try {
    if (_statsCache && Date.now() - _statsAt < 15000) return res.json(_statsCache);
    const [totalRes, newRes, contactedRes, qualifiedRes, indianRes, foreignRes, recentRes] = await Promise.all([
      supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'New'),
      supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Contacted'),
      supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Qualified'),
      supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('country', 'Indian'),
      supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('country', 'Foreign'),
      supabaseAdmin.from('leads').select('source').limit(500)
    ]);
    const bySource = {};
    (recentRes.data || []).forEach(r => { bySource[r.source] = (bySource[r.source] || 0) + 1; });
    const result = { total: totalRes.count || 0, new: newRes.count || 0, contacted: contactedRes.count || 0, qualified: qualifiedRes.count || 0, indian: indianRes.count || 0, foreign: foreignRes.count || 0, bySource };
    _statsCache = result; _statsAt = Date.now();
    res.json(result);
  } catch (e) {
    console.error('stats error', e);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Distinct values for filter dropdowns
app.get('/api/leads/meta', async (req, res) => {
  try {
    const { data } = await supabaseAdmin.from('leads').select('source,country,status').limit(2000);
    const sources = [...new Set((data || []).map(d => d.source).filter(Boolean))].sort();
    const countries = [...new Set((data || []).map(d => d.country).filter(Boolean))].sort();
    const statuses = VALID_STATUSES;
    res.json({ sources, countries, statuses });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch meta' });
  }
});

// List leads with pagination + filters
app.get('/api/leads', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 24));
    const offset = (page - 1) * limit;
    const search = sanitizeString(req.query.search, 200) || undefined;
    const source = sanitizeString(req.query.source, 80) || undefined;
    const country = sanitizeString(req.query.country, 30) || undefined;
    const status = sanitizeString(req.query.status, 30) || undefined;
    const sort = req.query.sort === 'asc' ? 'asc' : 'desc';
    const dateFrom = req.query.dateFrom || undefined;
    const dateTo = req.query.dateTo || undefined;

    let query = supabaseAdmin.from('leads').select('*', { count: 'exact' });
    query = applyFilters(query, { search, source, country, status, dateFrom, dateTo });
    query = query.order('date', { ascending: sort === 'asc' }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0),
      },
      filters: { search, source, country, status, sort, dateFrom, dateTo }
    });
  } catch (e) {
    console.error('list leads error', e);
    res.status(500).json({ error: 'Failed to fetch leads', details: e.message });
  }
});

// Get single lead
app.get('/api/leads/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('leads').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Lead not found' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Create single lead (manual)
app.post('/api/leads', async (req, res) => {
  try {
    if (process.env.LEADS_WEBHOOK_SECRET) {
      const secret = req.headers['x-webhook-secret'];
      if (secret !== process.env.LEADS_WEBHOOK_SECRET) return res.status(401).json({ error: 'Unauthorized' });
    }
    const normalized = normalizeLead(req.body);
    if (!normalized) return res.status(400).json({ error: 'Invalid lead: title and valid link required' });

    const { data, error } = await supabaseAdmin.from('leads').upsert(normalized, { onConflict: 'link', ignoreDuplicates: false }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    console.error('create lead error', e);
    if (e.code === '23505') return res.status(409).json({ error: 'Lead with this link already exists' });
    res.status(500).json({ error: 'Failed to create lead', details: e.message });
  }
});

// Bulk ingest - primary webhook for n8n
app.post('/api/leads/ingest', async (req, res) => {
  try {
    // Optional webhook secret check
    if (process.env.LEADS_WEBHOOK_SECRET) {
      const secret = req.headers['x-webhook-secret'] || req.query.secret;
      if (secret !== process.env.LEADS_WEBHOOK_SECRET) return res.status(401).json({ error: 'Unauthorized - invalid webhook secret' });
    }

    let rawLeads = [];
    if (Array.isArray(req.body)) rawLeads = req.body;
    else if (Array.isArray(req.body.leads)) rawLeads = req.body.leads;
    else if (req.body.json && Array.isArray(req.body.json)) rawLeads = req.body.json; // n8n wrapped
    else if (typeof req.body === 'object' && req.body.link) rawLeads = [req.body];
    else if (typeof req.body === 'object') {
      // Single n8n style object with Date, Status...
      const hasLeadKeys = ['Title', 'Link', 'title', 'link'].some(k => k in req.body);
      if (hasLeadKeys) rawLeads = [req.body];
      else rawLeads = Object.values(req.body).filter(v => typeof v === 'object' && v && ('link' in v || 'Link' in v));
    }

    if (!rawLeads.length) return res.status(400).json({ error: 'No leads provided. Send { leads: [...] } or a single lead object with title+link' });

    const normalized = rawLeads.map(normalizeLead).filter(Boolean);
    if (!normalized.length) return res.status(400).json({ error: 'No valid leads after validation. Each lead needs title and valid link.' });

    // Deduplicate within payload by link
    const seen = new Map();
    normalized.forEach(l => { if (!seen.has(l.link)) seen.set(l.link, l); });
    const unique = [...seen.values()];

    // Fetch existing links to count skipped vs new (for reporting)
    const links = unique.map(l => l.link);
    const { data: existing } = await supabaseAdmin.from('leads').select('link').in('link', links);
    const existingSet = new Set((existing || []).map(e => e.link));

    // Upsert: update existing? We want to keep first seen but refresh snippet if new? Use upsert with ignoreDuplicates:false will update.
    // For true dedup (do not overwrite), we could use ignoreDuplicates:true and only insert new.
    // We choose to insert new only, skip existing to preserve original date/status.
    const toInsert = unique.filter(l => !existingSet.has(l.link));
    const skipped = unique.length - toInsert.length;

    let inserted = [];
    let errorDetails = null;

    if (toInsert.length) {
      // Batch in chunks of 50 to avoid payload limits
      for (let i = 0; i < toInsert.length; i += 50) {
        const chunk = toInsert.slice(i, i + 50);
        const { data, error } = await supabaseAdmin.from('leads').insert(chunk).select();
        if (error) {
          console.error('chunk insert error', error);
          errorDetails = error.message;
          // try individual upsert fallback
          for (const lead of chunk) {
            const { data: one, error: oneErr } = await supabaseAdmin.from('leads').upsert(lead, { onConflict: 'link', ignoreDuplicates: true }).select();
            if (!oneErr && one) inserted.push(...one);
          }
        } else if (data) inserted.push(...data);
      }
    }

    res.json({
      success: true,
      received: rawLeads.length,
      normalized: normalized.length,
      unique: unique.length,
      inserted: inserted.length,
      skipped,
      duplicates: skipped,
      errorDetails,
      insertedIds: inserted.map(i => i.id).slice(0, 10),
    });
  } catch (e) {
    console.error('ingest error', e);
    res.status(500).json({ error: 'Ingest failed', details: e.message });
  }
});

// Update lead (status mainly)
app.patch('/api/leads/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.status && VALID_STATUSES.includes(req.body.status)) updates.status = req.body.status;
    if (req.body.country && VALID_COUNTRIES.includes(req.body.country)) updates.country = req.body.country;
    if (req.body.source) updates.source = sanitizeString(req.body.source, 80);
    if (req.body.title) updates.title = sanitizeString(req.body.title, 500);
    if (req.body.snippet != null) updates.snippet = sanitizeString(req.body.snippet, 5000);
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update. Allowed: status, country, source, title, snippet' });

    const { data, error } = await supabaseAdmin.from('leads').update(updates).eq('id', req.params.id).select().single();
    if (error) return res.status(404).json({ error: 'Lead not found or update failed', details: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Delete lead
app.delete('/api/leads/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('leads').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Bulk delete / archive
app.post('/api/leads/bulk', async (req, res) => {
  try {
    const { action, ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array required' });
    if (action === 'delete') {
      const { error } = await supabaseAdmin.from('leads').delete().in('id', ids);
      if (error) throw error;
      return res.json({ success: true, deleted: ids.length });
    }
    if (action === 'archive' || action === 'status') {
      const status = req.body.status || 'Archived';
      if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
      const { error } = await supabaseAdmin.from('leads').update({ status }).in('id', ids);
      if (error) throw error;
      return res.json({ success: true, updated: ids.length, status });
    }
    res.status(400).json({ error: 'Unknown bulk action' });
  } catch (e) {
    res.status(500).json({ error: 'Bulk operation failed', details: e.message });
  }
});

// --- Static frontend in production (non-Vercel only) ---
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;

if (require.main === module && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`ZeroThree + Leads API listening on http://localhost:${port}`);
    console.log(`Supabase: ${process.env.SUPABASE_URL}`);
    console.log(`Endpoints: GET /api/leads, POST /api/leads/ingest, GET /api/leads/stats`);
  });
}
