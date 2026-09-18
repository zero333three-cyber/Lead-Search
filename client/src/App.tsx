import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchLeads, fetchStats, fetchMeta, updateLeadStatus, deleteLead, Lead, LeadsStats, formatDate, formatRelative, groupByDate, sourceColor } from './lib/api';

const STATUS_OPTIONS = ['All', 'New', 'Contacted', 'Qualified', 'Closed', 'Archived'] as const;
const COUNTRY_OPTIONS = ['All', 'Foreign', 'Indian', 'Unknown'] as const;

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadsStats | null>(null);
  const [meta, setMeta] = useState<{ sources: string[]; countries: string[]; statuses: string[] } | null>(null);
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

  const load = useCallback(async (p = 1, showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [res, st, mt] = await Promise.all([
        fetchLeads({ page: p, limit: 24, search: debounced || undefined, source, country, status: statusFilter, sort }),
        fetchStats().catch(() => null),
        fetchMeta().catch(() => null),
      ]);
      setLeads(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages || 1);
      setPage(res.pagination.page);
      if (st) setStats(st);
      if (mt) setMeta(mt);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debounced, source, country, statusFilter, sort]);

  useEffect(() => { load(1); }, [load]);

  const grouped = useMemo(() => groupByDate(leads), [leads]);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const handleStatus = async (lead: Lead, ns: string) => {
    try {
      const upd = await updateLeadStatus(lead.id, ns as any);
      setLeads(prev => prev.map(l => l.id === lead.id ? upd : l));
      if (selected?.id === lead.id) setSelected(upd);
      showToast(`Status → ${ns}`);
      fetchStats().then(setStats).catch(()=>{});
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
            <div className="brand-mark">LS</div>
            <div>
              <h1>Lead Search</h1>
              <p>n8n → Supabase • Boxes by date • Click box for details</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn" onClick={()=>load(page,false)} disabled={refreshing}>{refreshing?'Refreshing…':'↻ Refresh'}</button>
            <a className="btn btn-primary" href="https://urwdxfrgsbrbmeuwtyrx.supabase.co" target="_blank" rel="noreferrer">Supabase ↗</a>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="page-head">
          <h2>📥 Leads Inbox</h2>
          <p>Every lead from your n8n workflow lands here as a box grouped by date. Click any box to see full details.</p>
        </div>

        <div className="stats">
          <div className="stat"><strong>{stats?.total ?? total}</strong><span>Total</span></div>
          <div className="stat accent"><strong>{stats?.new ?? leads.filter(l=>l.status==='New').length}</strong><span>New</span></div>
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
          <span>Data via Supabase • Dedup by link</span>
        </div>

        {error && <div className="error">⚠ {error}<button onClick={()=>load(page)}>Retry</button></div>}

        {loading ? (
          <div className="grid">{Array.from({length:6}).map((_,i)=>(<div key={i} className="card skeleton"><div className="sk h w1"/><div className="sk w2"/><div className="sk w3"/></div>))}</div>
        ) : leads.length===0 ? (
          <div className="empty">
            <h3>No leads found</h3>
            <p>{debounced||source!=='All'||country!=='All'||statusFilter!=='All'?'Try adjusting filters.':'Your n8n workflow will push leads here. Test: POST /api/leads/ingest'}</p>
            <button className="btn btn-primary" onClick={()=>{setSearch('');setSource('All');setCountry('All');setStatusFilter('All');}}>Clear filters</button>
          </div>
        ) : (
          <>
            {grouped.map(([key, group])=>{
              const d=new Date(key); const isToday=new Date().toLocaleDateString('en-CA')===key; const isYesterday=new Date(Date.now()-86400000).toLocaleDateString('en-CA')===key;
              const label=isToday?'Today':isYesterday?'Yesterday':d.toLocaleDateString('en-IN',{weekday:'long', day:'numeric', month:'long', year:'numeric'});
              return (
                <div key={key} className="date-group">
                  <div className="date-header"><span className="date-badge">📅 {label}</span><span className="date-count">{group.length} leads • {key}</span><div className="date-line"/></div>
                  <div className="grid">
                    {group.map(lead=>(
                      <article key={lead.id} className="card" onClick={()=>setSelected(lead)} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&setSelected(lead)}>
                        <div className="card-top">
                          <span className="time">🕒 {formatRelative(lead.date)} • {new Date(lead.date).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
                          <span className={`status ${lead.status.toLowerCase()}`}>{lead.status}</span>
                        </div>
                        <h3 title={lead.title}>{lead.title}</h3>
                        <div className="badges">
                          <span className="badge source" style={{background:sourceColor(lead.source)}}>{lead.source}</span>
                          <span className={`badge country ${lead.country.toLowerCase()}`}>{lead.country}</span>
                          {lead.matched_keyword && <span className="badge keyword">{lead.matched_keyword}</span>}
                        </div>
                        <p className="snippet">{lead.snippet || 'No snippet — click for link & details'}</p>
                        <div className="card-foot">
                          <span className="link" onClick={e=>{e.stopPropagation(); window.open(lead.link,'_blank');}}>{(() => { try { return new URL(lead.link).hostname.replace('www.',''); } catch { return lead.link; }})()} ↗</span>
                          <span className="view">View →</span>
                        </div>
                      </article>
                    ))}
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

      {selected && (
        <div className="overlay" onClick={()=>setSelected(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-head">
              <div>
                <div className="kicker">📅 {formatDate(selected.date)} • {formatRelative(selected.date)}</div>
                <h2>{selected.title}</h2>
                <div className="modal-badges">
                  <span className="badge-lg source" style={{background:sourceColor(selected.source)}}>{selected.source}</span>
                  <span className={`badge-lg`} style={{background:selected.country==='Indian'?'#fef9c3':'#eff6ff', color:selected.country==='Indian'?'#854d0e':'#2563eb'}}>{selected.country}</span>
                  <span className={`badge-lg`} style={{background:'#f1f5f9'}}>{selected.status}</span>
                </div>
              </div>
              <button className="close" onClick={()=>setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="item"><label>🔗 Link</label><div className="link-row"><a href={selected.link} target="_blank" rel="noreferrer">{selected.link}</a><button className="icon-btn" onClick={()=>copy(selected.link)} title="Copy">⧉</button><a className="icon-btn" href={selected.link} target="_blank" rel="noreferrer">↗</a></div></div>
                <div className="item"><label>🏷 Matched Keyword</label><p>{selected.matched_keyword || '—'}</p></div>
                <div className="item"><label>✓ Status</label><div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><select value={selected.status} onChange={e=>handleStatus(selected,e.target.value)} style={{height:36,border:'1px solid #e2e8f0',borderRadius:8,padding:'0 8px',fontWeight:600}}>{STATUS_OPTIONS.filter(s=>s!=='All').map(s=><option key={s} value={s}>{s}</option>)}</select><span style={{color:'#64748b',fontSize:12}}>Change to Contacted/Qualified/Closed as you work</span></div></div>
                <div className="row2">
                  <div className="item"><label>🌐 Source</label><p>{selected.source}</p></div>
                  <div className="item"><label>📍 Country</label><p>{selected.country}</p></div>
                </div>
                <div className="item"><label>🕒 Date & Time</label><p>{formatDate(selected.date)}<br/><small style={{color:'#64748b'}}>{new Date(selected.date).toISOString()}</small></p></div>
                <div className="item"><label>📝 Description / Snippet</label><div className="snippet-full">{selected.snippet || 'No description provided by source.'}</div></div>
                <div className="item"><label>ID</label><p className="mono">{selected.id}</p></div>
              </div>
              <div className="actions">
                <a className="btn btn-primary" href={selected.link} target="_blank" rel="noreferrer">Open Original ↗</a>
                <button className="btn" onClick={()=>copy(selected.link)}>⧉ Copy Link</button>
                <button className="btn" onClick={()=>handleStatus(selected,'Contacted')}>✓ Mark Contacted</button>
                <button className="btn danger" onClick={()=>handleDelete(selected)}>🗑 Delete</button>
              </div>
              <div className="hint">
                <strong>How new leads appear:</strong> Your n8n workflow POSTs to <code>/api/leads/ingest</code> every 6h. Each lead creates a new box grouped by date. Dedup is by <code>Link</code> — same link won't create duplicate boxes.
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
