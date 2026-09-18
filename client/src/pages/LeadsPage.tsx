import { useEffect, useState, useCallback, useMemo } from 'react';
import { FiSearch, FiExternalLink, FiClock, FiTrash2, FiX, FiCopy, FiRefreshCw, FiFilter, FiGrid, FiCalendar, FiTag, FiGlobe, FiMapPin, FiCheckCircle, FiInbox, FiAlertCircle, FiChevronLeft, FiChevronRight, FiArchive, FiTrendingUp } from 'react-icons/fi';
import { fetchLeads, fetchStats, fetchMeta, updateLeadStatus, deleteLead, Lead, LeadsStats, formatDate, formatRelative, groupByDate, getSourceColor } from '../lib/api';

const STATUS_OPTIONS = ['All', 'New', 'Contacted', 'Qualified', 'Closed', 'Archived'] as const;
const COUNTRY_OPTIONS = ['All', 'Foreign', 'Indian', 'Unknown'] as const;

export default function LeadsPage() {
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (p = 1, showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [res, st, mt] = await Promise.all([
        fetchLeads({ page: p, limit: 24, search: debouncedSearch || undefined, source, country, status: statusFilter, sort }),
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
      setError(e.message || 'Failed to load leads');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, source, country, statusFilter, sort]);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => { setPage(1); }, [debouncedSearch, source, country, statusFilter, sort]);

  const grouped = useMemo(() => groupByDate(leads), [leads]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    try {
      const updated = await updateLeadStatus(lead.id, newStatus as any);
      setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
      if (selected?.id === lead.id) setSelected(updated);
      showToast(`Status → ${newStatus}`);
      // refresh stats
      fetchStats().then(setStats).catch(() => {});
    } catch (e: any) { showToast(e.message || 'Update failed'); }
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Delete lead "${lead.title.slice(0,60)}..." ?`)) return;
    try {
      await deleteLead(lead.id);
      setLeads(prev => prev.filter(l => l.id !== lead.id));
      if (selected?.id === lead.id) setSelected(null);
      showToast('Lead deleted');
      setTotal(t => Math.max(0, t - 1));
    } catch (e: any) { showToast(e.message || 'Delete failed'); }
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    showToast('Link copied');
  };

  return (
    <div className="leads-page">
      {/* Header */}
      <div className="leads-header">
        <div className="leads-title-row">
          <div>
            <h1><FiInbox /> Leads Inbox</h1>
            <p>Every lead from your n8n workflow lands here as a box. Click any box to see full details.</p>
          </div>
          <button className="btn-refresh" onClick={() => load(page, false)} disabled={refreshing} title="Refresh">
            <FiRefreshCw className={refreshing ? 'spin' : ''} /> {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Stats bar */}
        <div className="stats-bar">
          <div className="stat-mini"><strong>{stats?.total ?? total}</strong><span>Total Leads</span></div>
          <div className="stat-mini accent"><strong>{stats?.new ?? leads.filter(l=>l.status==='New').length}</strong><span>New</span></div>
          <div className="stat-mini"><strong>{stats?.contacted ?? 0}</strong><span>Contacted</span></div>
          <div className="stat-mini"><strong>{stats?.indian ?? 0}</strong><span>Indian</span></div>
          <div className="stat-mini"><strong>{stats?.foreign ?? 0}</strong><span>Foreign</span></div>
          <div className="stat-mini hide-mobile"><FiTrendingUp /> <span>{total} total &bull; {grouped.length} dates</span></div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="search-wrap">
            <FiSearch />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, snippet, keyword, link..." />
            {search && <button className="clear-search" onClick={() => setSearch('')}><FiX /></button>}
          </div>
          <div className="filter-pills">
            <div className="select-wrap">
              <FiFilter /><select value={source} onChange={e => setSource(e.target.value)}>
                <option value="All">All Sources</option>
                {(meta?.sources?.length ? meta.sources : ['Reddit','HackerNews','RemoteOK','WeWorkRemotely','IndieHackers']).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="select-wrap">
              <FiGlobe /><select value={country} onChange={e => setCountry(e.target.value)}>
                {COUNTRY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="select-wrap">
              <FiTag /><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="select-wrap">
              <FiClock /><select value={sort} onChange={e => setSort(e.target.value as any)}>
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
          </div>
        </div>

        <div className="results-meta">
          <span>{loading ? 'Loading...' : `${total} leads`}{debouncedSearch ? ` for "${debouncedSearch}"` : ''} • Page {page} of {totalPages}</span>
          <span className="hide-mobile">Click any box to view full details • Data from Supabase</span>
        </div>
      </div>

      {/* Content */}
      {error && <div className="leads-error"><FiAlertCircle /> {error} <button onClick={() => load(page)}>Retry</button></div>}

      {loading ? (
        <div className="leads-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="lead-card skeleton">
              <div className="sk-line w-60" /><div className="sk-line w-90" /><div className="sk-line w-80" />
            </div>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><FiInbox /></div>
          <h3>No leads found</h3>
          <p>{debouncedSearch || source !== 'All' || country !== 'All' || statusFilter !== 'All' ? 'Try adjusting filters or search.' : 'Your n8n workflow will push leads here. Test with POST /api/leads/ingest.'}</p>
          <div className="empty-actions">
            <button className="button button-primary" onClick={() => { setSearch(''); setSource('All'); setCountry('All'); setStatusFilter('All'); }}>Clear filters</button>
            <a className="button button-secondary" href="https://urwdxfrgsbrbmeuwtyrx.supabase.co" target="_blank" rel="noreferrer">Open Supabase <FiExternalLink /></a>
          </div>
        </div>
      ) : (
        <>
          {grouped.map(([dateKey, groupLeads]) => {
            const d = new Date(dateKey);
            const isToday = new Date().toLocaleDateString('en-CA') === dateKey;
            const isYesterday = new Date(Date.now()-86400000).toLocaleDateString('en-CA') === dateKey;
            const label = isToday ? 'Today' : isYesterday ? 'Yesterday' : d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            return (
              <div key={dateKey} className="date-group">
                <div className="date-header">
                  <span className="date-badge"><FiCalendar /> {label}</span>
                  <span className="date-count">{groupLeads.length} leads • {dateKey}</span>
                  <div className="date-line" />
                </div>
                <div className="leads-grid">
                  {groupLeads.map(lead => (
                    <article key={lead.id} className="lead-card" onClick={() => setSelected(lead)} role="button" tabIndex={0} onKeyDown={e => e.key==='Enter' && setSelected(lead)}>
                      <div className="card-top">
                        <span className="time-chip" title={formatDate(lead.date)}><FiClock /> {formatRelative(lead.date)} • {new Date(lead.date).toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'})}</span>
                        <span className={`status-dot ${lead.status.toLowerCase()}`} title={lead.status}>{lead.status}</span>
                      </div>
                      <h3 className="card-title" title={lead.title}>{lead.title}</h3>
                      <div className="card-badges">
                        <span className="badge-sm source" style={{ ['--src' as any]: getSourceColor(lead.source) } as any}>{lead.source}</span>
                        <span className={`badge-sm country ${lead.country.toLowerCase()}`}><FiMapPin /> {lead.country}</span>
                        {lead.matched_keyword && <span className="badge-sm keyword"><FiTag /> {lead.matched_keyword}</span>}
                      </div>
                      <p className="card-snippet">{lead.snippet || 'No snippet — click to view link and details.'}</p>
                      <div className="card-foot">
                        <span className="link-preview" onClick={(e)=>{e.stopPropagation(); window.open(lead.link, '_blank');}}><FiExternalLink /> {new URL(lead.link).hostname.replace('www.','')}</span>
                        <span className="view-hint">Click to view →</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => load(page - 1)}><FiChevronLeft /> Prev</button>
            <span>Page {page} / {totalPages} • {total} leads</span>
            <button disabled={page >= totalPages} onClick={() => load(page + 1)}>Next <FiChevronRight /></button>
          </div>
        </>
      )}

      {/* Drawer */}
      {selected && (
        <div className="drawer-overlay" onClick={() => setSelected(null)}>
          <div className="drawer" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="drawer-head">
              <div className="drawer-head-left">
                <span className="drawer-kicker"><FiCalendar /> {formatDate(selected.date)} • {formatRelative(selected.date)}</span>
                <h2>{selected.title}</h2>
                <div className="drawer-badges">
                  <span className="badge-lg source" style={{ background: getSourceColor(selected.source) }}>{selected.source}</span>
                  <span className={`badge-lg country ${selected.country.toLowerCase()}`}>{selected.country}</span>
                  <span className={`badge-lg status ${selected.status.toLowerCase()}`}>{selected.status}</span>
                </div>
              </div>
              <button className="drawer-close" onClick={() => setSelected(null)}><FiX /></button>
            </div>

            <div className="drawer-body">
              <div className="detail-grid">
                <div className="detail-item"><label><FiGlobe /> Link</label><div className="link-row"><a href={selected.link} target="_blank" rel="noreferrer" className="detail-link">{selected.link}</a><button className="icon-btn" onClick={() => copyLink(selected.link)} title="Copy"><FiCopy /></button><a className="icon-btn" href={selected.link} target="_blank" rel="noreferrer" title="Open"><FiExternalLink /></a></div></div>
                <div className="detail-item"><label><FiTag /> Matched Keyword</label><p>{selected.matched_keyword || '—'}</p></div>
                <div className="detail-item"><label><FiCheckCircle /> Status</label>
                  <div className="status-actions">
                    <select value={selected.status} onChange={e => handleStatusChange(selected, e.target.value)}>
                      {STATUS_OPTIONS.filter(s=>s!=='All').map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <span className="status-hint">Change to Contacted/Qualified/Closed as you work</span>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-item half"><label><FiGlobe /> Source</label><p>{selected.source}</p></div>
                  <div className="detail-item half"><label><FiMapPin /> Country</label><p>{selected.country}</p></div>
                </div>
                <div className="detail-item"><label><FiClock /> Date & Time</label><p>{formatDate(selected.date)}<br /><small>{new Date(selected.date).toISOString()}</small></p></div>
                <div className="detail-item full"><label><FiGrid /> Description / Snippet</label><div className="snippet-full">{selected.snippet || 'No description provided by source.'}</div></div>
                <div className="detail-item full"><label>Lead ID</label><p className="mono">{selected.id}</p></div>
              </div>

              <div className="drawer-actions">
                <a className="button button-primary" href={selected.link} target="_blank" rel="noreferrer">Open Original <FiExternalLink /></a>
                <button className="button button-secondary" onClick={() => copyLink(selected.link)}><FiCopy /> Copy Link</button>
                <button className="button button-secondary" onClick={() => handleStatusChange(selected, 'Contacted')}><FiCheckCircle /> Mark Contacted</button>
                <button className="button danger" onClick={() => handleDelete(selected)}><FiTrash2 /> Delete</button>
                <button className="button button-secondary" onClick={() => handleStatusChange(selected, 'Archived')}><FiArchive /> Archive</button>
              </div>

              <div className="ingest-hint">
                <strong>How new leads appear:</strong> Your n8n nodes will POST to <code>/api/leads/ingest</code> every 6 hours. Each lead creates a new box here with timestamp. Deduplication is by <code>Link</code> — same link won't create duplicate boxes.
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
