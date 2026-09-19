import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchLeads, fetchGroups, fetchStats, fetchMeta, updateLeadStatus, deleteLead, Lead, Group, LeadsStats, formatIST, formatRelative, sourceColor } from './lib/api';

const STATUS_OPTIONS = ['All', 'New', 'Contacted', 'Qualified', 'Closed', 'Archived'] as const;
const COUNTRY_OPTIONS = ['All', 'Foreign', 'Indian', 'Unknown'] as const;

function ClockSVG({ iso, size = 56 }: { iso: string; size?: number }) {
  const d = new Date(iso);
  // get IST hours/minutes
  const ist = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const h = ist.getHours() % 12;
  const m = ist.getMinutes();
  const hourAngle = (h + m / 60) * 30;
  const minuteAngle = m * 6;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
        </filter>
      </defs>
      <circle cx="50" cy="50" r="46" fill="white" stroke="#e2e8f0" strokeWidth="2" filter="url(#sh)" />
      <circle cx="50" cy="50" r="42" fill="#f8fafc" />
      {/* ticks */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = i * 30;
        const isHour = i % 3 === 0;
        const r1 = isHour ? 38 : 40;
        const r2 = 42;
        const x1 = 50 + r1 * Math.sin((angle * Math.PI) / 180);
        const y1 = 50 - r1 * Math.cos((angle * Math.PI) / 180);
        const x2 = 50 + r2 * Math.sin((angle * Math.PI) / 180);
        const y2 = 50 - r2 * Math.cos((angle * Math.PI) / 180);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isHour ? '#334155' : '#cbd5e1'} strokeWidth={isHour ? 1.8 : 1} strokeLinecap="round" />;
      })}
      <line x1="50" y1="50" x2="50" y2="32" transform={`rotate(${hourAngle} 50 50)`} stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="50" y1="50" x2="50" y2="22" transform={`rotate(${minuteAngle} 50 50)`} stroke="url(#cg)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="50" r="4.5" fill="#0f172a" />
      <circle cx="50" cy="50" r="2" fill="white" />
    </svg>
  );
}

export default function App() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [stats, setStats] = useState<LeadsStats | null>(null);
  const [meta, setMeta] = useState<{ sources: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('All');
  const [country, setCountry] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sort, setSort] = useState<'desc' | 'asc'>('desc');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [debounced, setDebounced] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [groupLeads, setGroupLeads] = useState<Record<string, Lead[]>>({});
  const [groupLoading, setGroupLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadGroups = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [g, st, mt] = await Promise.all([
        fetchGroups({ search: debounced || undefined, source, country, status: statusFilter }),
        fetchStats().catch(() => null),
        fetchMeta().catch(() => null),
      ]);
      setGroups(g);
      if (st) setStats(st);
      if (mt) setMeta(mt);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debounced, source, country, statusFilter]);

  useEffect(() => {
    loadGroups(true);
    // clear expanded when filters change
    setExpanded(new Set());
    setGroupLeads({});
  }, [loadGroups]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const toggleGroup = async (g: Group) => {
    const key = g.dateKey;
    const isOpen = expanded.has(key);
    if (isOpen) {
      const next = new Set(expanded);
      next.delete(key);
      setExpanded(next);
      return;
    }
    // open
    const next = new Set(expanded);
    next.add(key);
    setExpanded(next);
    if (groupLeads[key]) return; // already fetched
    setGroupLoading(s => ({ ...s, [key]: true }));
    try {
      const from = new Date(key + 'T00:00:00+05:30').toISOString();
      const to = new Date(key + 'T23:59:59+05:30').toISOString();
      const res = await fetchLeads({ search: debounced || undefined, source, country, status: statusFilter, sort, dateFrom: from, dateTo: to, limit: 50 });
      setGroupLeads(s => ({ ...s, [key]: res.data }));
    } catch (e: any) {
      showToast(e.message || 'Failed to load leads for date');
    } finally {
      setGroupLoading(s => ({ ...s, [key]: false }));
    }
  };

  const handleStatus = async (lead: Lead, ns: string) => {
    try {
      const upd = await updateLeadStatus(lead.id, ns as any);
      // update in groupLeads
      setGroupLeads(prev => {
        const next: Record<string, Lead[]> = {};
        for (const k in prev) next[k] = prev[k].map(l => l.id === lead.id ? upd : l);
        return next;
      });
      if (selected?.id === lead.id) setSelected(upd);
      showToast(`Status → ${ns}`);
    } catch (e:any) { showToast(e.message || 'Update failed'); }
  };
  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Delete "${lead.title.slice(0,60)}..."?`)) return;
    try {
      await deleteLead(lead.id);
      setGroupLeads(prev => {
        const next: Record<string, Lead[]> = {};
        for (const k in prev) next[k] = prev[k].filter(l => l.id !== lead.id);
        return next;
      });
      // also update groups count and stats
      setGroups(prev => prev.map(g => {
        // if deleted lead belonged to this group, decrement
        const leads = groupLeads[g.dateKey] || [];
        if (leads.some(l => l.id === lead.id)) return { ...g, count: Math.max(0, g.count - 1) };
        return g;
      }).filter(g => g.count > 0));
      if(selected?.id===lead.id) setSelected(null);
      showToast('Deleted');
      // refresh stats quickly
      fetchStats().then(setStats).catch(()=>{});
    } catch (e:any){ showToast(e.message); }
  };
  const copy = async (v:string) => { await navigator.clipboard.writeText(v); showToast('Copied'); };

  const totalLeads = useMemo(() => groups.reduce((a, g) => a + g.count, 0), [groups]);

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
              <p>Clean inbox • Boxes by date • IST</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn" onClick={()=>loadGroups(false)} disabled={refreshing}>{refreshing?'Refreshing…':'↻ Refresh'}</button>
            <a className="btn btn-primary" href="https://supabase.com/dashboard/project/urwdxfrgsbrbmeuwtyrx" target="_blank" rel="noreferrer">Supabase ↗</a>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="page-head">
          <h2>Leads Inbox</h2>
          <p>Only <b>date & time</b> boxes are shown. Click any date box to see all leads generated at that time. No messy grid until you open a box.</p>
        </div>

        <div className="stats">
          <div className="stat"><strong>{stats?.total ?? totalLeads}</strong><span>Total</span></div>
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
          <span>{loading ? 'Loading…' : `${groups.length} dates • ${totalLeads} leads${debounced?` • “${debounced}”`:''}`}</span>
          <span>Tap a date box to expand • IST • Dedup by link</span>
        </div>

        {error && <div className="error">⚠ {error}<button onClick={()=>loadGroups()}>Retry</button></div>}

        {loading ? (
          <div className="groups-skeleton">
            {Array.from({length:3}).map((_,i)=>(<div key={i} className="group-box skeleton"><div className="sk h w1"/><div className="sk w2"/></div>))}
          </div>
        ) : groups.length===0 ? (
          <div className="empty">
            <div className="empty-ill">📭</div>
            <h3>No leads yet</h3>
            <p>{debounced||source!=='All'||country!=='All'||statusFilter!=='All'?'Try adjusting filters.':'Your n8n workflow will push leads here. Waiting for first run…'}</p>
            <button className="btn btn-primary" onClick={()=>{setSearch('');setSource('All');setCountry('All');setStatusFilter('All');}}>Clear filters</button>
          </div>
        ) : (
          <div className="groups">
            {groups.map(g=>{
              const isOpen = expanded.has(g.dateKey);
              const leads = groupLeads[g.dateKey] || [];
              const loadingGroup = groupLoading[g.dateKey];
              return (
                <div key={g.dateKey} className={`group ${isOpen ? 'open' : ''}`}>
                  <button className="group-box" onClick={()=>toggleGroup(g)} aria-expanded={isOpen}>
                    <div className="group-left">
                      <div className="clock-wrap">
                        <ClockSVG iso={g.iso} size={56} />
                      </div>
                      <div className="group-text">
                        <div className="group-date">{g.fullLabel}</div>
                        <div className="group-meta">{g.time} • {g.count} leads • {g.sources.slice(0,2).join(', ')}{g.sources.length>2?` +${g.sources.length-2}`:''}</div>
                      </div>
                    </div>
                    <div className="group-right">
                      <span className="count-badge">{g.count} leads</span>
                      <span className="chevron">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="group-leads">
                      {loadingGroup ? (
                        <div className="grid">{Array.from({length:3}).map((_,i)=>(<div key={i} className="card skeleton"><div className="sk h w1"/><div className="sk w2"/><div className="sk w3"/></div>))}</div>
                      ) : leads.length===0 ? (
                        <div className="empty" style={{padding:'18px'}}>No leads for this date with current filters.</div>
                      ) : (
                        <div className="grid">
                          {leads.map(lead=>{
                            const {date, time} = formatIST(lead.date);
                            return (
                              <article key={lead.id} className="card" onClick={()=>setSelected(lead)} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&setSelected(lead)}>
                                <div className="card-body">
                                  <div className="time-single">{date} • {time} <span className="rel">• {formatRelative(lead.date)}</span></div>
                                  <h3 title={lead.title}>{lead.title}</h3>
                                  <div className="badges">
                                    <span className="badge source" style={{background:sourceColor(lead.source)}}>{lead.source}</span>
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
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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
