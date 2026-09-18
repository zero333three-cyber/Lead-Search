import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchLeads, fetchStats, fetchMeta, updateLeadStatus, deleteLead, Lead, LeadsStats, groupByDate, sourceColor } from './lib/api';

const STATUS_OPTIONS = ['All', 'New', 'Contacted', 'Qualified', 'Closed', 'Archived'] as const;
const COUNTRY_OPTIONS = ['All', 'Foreign', 'Indian', 'Unknown'] as const;

function formatIST(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Kolkata' });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) + ' IST';
  return { date, time };
}
function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
}

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadsStats | null>(null);
  const [meta, setMeta] = useState<{ sources: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('All');
  const [country, setCountry] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sort, setSort] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [debounced, setDebounced] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // cache meta/stats - fetch only once or when needed
  const [metaLoaded, setMetaLoaded] = useState(false);
  const load = useCallback(async (p = 1, showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const leadsPromise = fetchLeads({ page: p, limit: 24, search: debounced || undefined, source, country, status: statusFilter, sort });
      const needsMeta = !metaLoaded;
      const results = await Promise.all([
        leadsPromise,
        needsMeta ? fetchMeta().catch(() => null) : Promise.resolve(null),
        // stats cached for 15s on server, fetch every time but cheap now (parallel)
        fetchStats().catch(() => null),
      ]);
      const res = results[0] as any;
      const mt = results[1] as any;
      const st = results[2] as any;
      setLeads(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages || 1);
      setPage(res.pagination.page);
      if (mt) { setMeta(mt); setMetaLoaded(true); }
      if (st) setStats(st);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debounced, source, country, statusFilter, sort, metaLoaded]);

  useEffect(() => { load(1); }, [load]);

  const grouped = useMemo(() => groupByDate(leads), [leads]);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const handleStatus = async (lead: Lead, ns: string) => {
    try {
      const upd = await updateLeadStatus(lead.id, ns as any);
      setLeads(prev => prev.map(l => l.id === lead.id ? upd : l));
      if (selected?.id === lead.id) setSelected(upd);
      showToast(`Status → ${ns}`);
      // stats will refresh on next load via cache expiry
    } catch (e:any) { showToast(e.message || 'Update failed'); }
  };
  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Delete "${lead.title.slice(0,60)}..."?`)) return;
    try { await deleteLead(lead.id); setLeads(p=>p.filter(l=>l.id!==lead.id)); if(selected?.id===lead.id) setSelected(null); setTotal(t=>Math.max(0,t-1)); showToast('Deleted'); } catch (e:any){ showToast(e.message); }
  };
  const copy = async (v:string) => { await navigator.clipboard.writeText(v); showToast('Copied'); };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="logo">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="36" height="36" rx="9" fill="url(#g)"/>
                <path d="M10.5 18.5L15.2 23.2L25.5 12.8" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="17.5" cy="17.5" r="9.5" stroke="white" strokeOpacity="0.18" strokeWidth="1.2"/>
                <defs><linearGradient id="g" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#2563eb"/><stop offset="1" stopColor="#06b6d4"/></linearGradient></defs>
              </svg>
            </div>
            <div>
              <h1>LeadSearch</h1>
              <p>Clean leads inbox • Boxes by date • IST</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn" onClick={()=>load(page,false)} disabled={refreshing}>{refreshing?'Refreshing…':'↻ Refresh'}</button>
            <a className="btn btn-primary" href="https://supabase.com/dashboard/project/urwdxfrgsbrbmeuwtyrx" target="_blank" rel="noreferrer">Supabase ↗</a>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="page-head">
          <h2>Leads Inbox</h2>
          <p>Each box is a lead — image, date <b>DD-MM-YY</b> + <b>time IST</b> at top. Click any box to open all files generated at that time.</p>
        </div>

        <div className="stats">
          <div className="stat"><strong>{stats?.total ?? total}</strong><span>Total</span></div>
          <div className="stat accent"><strong>{stats?.new ?? 0}</strong><span>New</span></div>
          <div className="stat"><strong>{stats?.contacted ?? 0}</strong><span>Contacted</span></div>
          <div className="stat"><strong>{stats?.indian ?? 0}</strong><span>Indian</span></div>
          <div className="stat"><strong>{stats?.foreign ?? 0}</strong><span>Foreign</span></div>
        </div>

        <div className="filters">
          <div className="search-wrap">
            <span>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search title, snippet, keyword, link…" />
            {search && <button className="btn" style={{height:28, padding:'0 8px'}} onClick={()=>setSearch('')}>✕</button>}
          </div>
          <div className="filter-pills">
            <div className="select-wrap"><span>Source</span><select value={source} onChange={e=>setSource(e.target.value)}><option value="All">All</option>{(meta?.sources?.length?meta.sources:['Reddit','HackerNews','RemoteOK','WeWorkRemotely','IndieHackers']).map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div className="select-wrap"><span>Country</span><select value={country} onChange={e=>setCountry(e.target.value)}>{COUNTRY_OPTIONS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div className="select-wrap"><span>Status</span><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>{STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div className="select-wrap"><span>Sort</span><select value={sort} onChange={e=>setSort(e.target.value as any)}><option value="desc">Newest</option><option value="asc">Oldest</option></select></div>
          </div>
        </div>

        <div className="meta">
          <span>{loading ? 'Loading…' : `${total} leads • Page ${page}/${totalPages}${debounced?` • “${debounced}”`:''}`}</span>
          <span>Data via Supabase • IST • Dedup by link</span>
        </div>

        {error && <div className="error">⚠ {error}<button onClick={()=>load(page)}>Retry</button></div>}

        {loading ? (
          <div className="grid">{Array.from({length:6}).map((_,i)=>(<div key={i} className="card skeleton"><div className="img-skel"/><div className="sk h w1"/><div className="sk w2"/><div className="sk w3"/></div>))}</div>
        ) : leads.length===0 ? (
          <div className="empty">
            <div className="empty-ill">📭</div>
            <h3>No leads yet</h3>
            <p>{debounced||source!=='All'||country!=='All'||statusFilter!=='All'?'Try adjusting filters.':'Your n8n workflow will push leads here. Waiting for first run…'}</p>
            <button className="btn btn-primary" onClick={()=>{setSearch('');setSource('All');setCountry('All');setStatusFilter('All');}}>Clear filters</button>
          </div>
        ) : (
          <>
            {grouped.map(([key, group])=>{
              const d=new Date(key);
              const label = d.toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'2-digit', timeZone:'Asia/Kolkata' });
              const fullLabel = d.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'Asia/Kolkata' });
              return (
                <div key={key} className="date-group">
                  <div className="date-header"><span className="date-badge">{label} • {fullLabel}</span><span className="date-count">{group.length} leads</span><div className="date-line"/></div>
                  <div className="grid">
                    {group.map(lead=>{
                      const {date, time} = formatIST(lead.date);
                      const img = `https://picsum.photos/seed/${lead.id.slice(0,8)}/600/340`;
                      return (
                        <article key={lead.id} className="card" onClick={()=>setSelected(lead)} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&setSelected(lead)}>
                          <div className="card-img-wrap">
                            <img src={img} alt="" loading="lazy" />
                            <span className="img-badge" style={{background:sourceColor(lead.source)}}>{lead.source}</span>
                          </div>
                          <div className="card-body">
                            <div className="time-single">{date} • {time} <span className="rel">• {formatRelative(lead.date)}</span></div>
                            <h3 title={lead.title}>{lead.title}</h3>
                            <div className="badges">
                              {lead.matched_keyword && <span className="badge keyword">{lead.matched_keyword}</span>}
                              <span className={`badge country ${lead.country.toLowerCase()}`}>{lead.country}</span>
                            </div>
                            <p className="snippet">{lead.snippet || 'No snippet — click for link & details'}</p>
                            <div className="card-foot">
                              <span className="link" onClick={e=>{e.stopPropagation(); window.open(lead.link,'_blank');}}>{(() => { try { return new URL(lead.link).hostname.replace('www.',''); } catch { return 'Link'; }})()} ↗</span>
                              <span className="view">View →</span>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <div className="pagination">
              <button disabled={page<=1} onClick={()=>load(page-1)}>‹ Prev</button>
              <span>Page {page} / {totalPages} • {total} leads</span>
              <button disabled={page>=totalPages} onClick={()=>load(page+1)}>Next ›</button>
            </div>
          </>
        )}
      </main>

      {selected && (()=>{ const {date, time} = formatIST(selected.date); return (
        <div className="overlay" onClick={()=>setSelected(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-head">
              <div className="modal-head-left">
                <div className="kicker">{date} • {time} • {formatRelative(selected.date)}</div>
                <h2>{selected.title}</h2>
                <div className="modal-badges">
                  <span className="badge-lg source" style={{background:sourceColor(selected.source)}}>{selected.source}</span>
                  <span className="badge-lg" style={{background:selected.country==='Indian'?'#fef9c3':'#eff6ff', color:selected.country==='Indian'?'#854d0e':'#2563eb'}}>{selected.country}</span>
                </div>
              </div>
              <div className="modal-head-right">
                <button className="close" onClick={()=>setSelected(null)}>✕</button>
                <div className="status-below">
                  <label>Status</label>
                  <select value={selected.status} onChange={e=>handleStatus(selected,e.target.value)}>
                    {STATUS_OPTIONS.filter(s=>s!=='All').map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="item"><label>🔗 Link</label><div className="link-row"><a href={selected.link} target="_blank" rel="noreferrer">{selected.link}</a><button className="icon-btn" onClick={()=>copy(selected.link)} title="Copy">⧉</button><a className="icon-btn" href={selected.link} target="_blank" rel="noreferrer">↗</a></div></div>
                <div className="item"><label>🏷 Matched Keyword</label><p>{selected.matched_keyword || '—'}</p></div>
                <div className="item"><label>📍 Country</label><p>{selected.country}</p></div>
                <div className="item"><label>🕒 Date & Time (IST)</label><p>{date} • {time}<br/><small style={{color:'#64748b'}}>{formatRelative(selected.date)} • {new Date(selected.date).toISOString()}</small></p></div>
                <div className="item"><label>📝 Description / Snippet</label><div className="snippet-full">{selected.snippet || 'No description provided by source.'}</div></div>
                <div className="item"><label>ID</label><p className="mono">{selected.id}</p></div>
              </div>
              <div className="actions">
                <a className="btn btn-primary" href={selected.link} target="_blank" rel="noreferrer">Open Original ↗</a>
                <button className="btn" onClick={()=>copy(selected.link)}>⧉ Copy Link</button>
                <button className="btn danger" onClick={()=>handleDelete(selected)}>🗑 Delete</button>
              </div>
              <div className="hint">
                <strong>How it works:</strong> n8n POSTs to <code>/api/leads/ingest</code> — each lead becomes a box grouped by date. Dedup by <code>Link</code>.
              </div>
            </div>
          </div>
        </div>
      )})()}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
