export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Closed' | 'Archived';
export type Lead = {
  id: string;
  date: string;
  status: LeadStatus;
  source: string;
  country: string;
  title: string;
  link: string;
  matched_keyword: string | null;
  snippet: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadsResponse = {
  data: Lead[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
};

export type LeadsStats = {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  indian: number;
  foreign: number;
  bySource: Record<string, number>;
};

async function req<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.details || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchLeads(params: {
  page?: number;
  limit?: number;
  search?: string;
  source?: string;
  country?: string;
  status?: string;
  sort?: 'asc' | 'desc';
}): Promise<LeadsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.source && params.source !== 'All') qs.set('source', params.source);
  if (params.country && params.country !== 'All') qs.set('country', params.country);
  if (params.status && params.status !== 'All') qs.set('status', params.status);
  if (params.sort) qs.set('sort', params.sort);
  return req(`/api/leads?${qs.toString()}`);
}

export async function fetchStats(): Promise<LeadsStats> {
  return req('/api/leads/stats');
}
export async function fetchMeta(): Promise<{ sources: string[]; countries: string[]; statuses: string[] }> {
  return req('/api/leads/meta');
}
export async function updateLeadStatus(id: string, status: LeadStatus): Promise<Lead> {
  return req(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}
export async function deleteLead(id: string) {
  return req(`/api/leads/${id}`, { method: 'DELETE' });
}

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}
export function formatRelative(dateStr: string) {
  const d = new Date(dateStr).getTime();
  const now = Date.now();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
export function groupByDate(leads: Lead[]) {
  const groups: Record<string, Lead[]> = {};
  leads.forEach(l => {
    const key = new Date(l.date).toLocaleDateString('en-CA');
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  });
  const sorted = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  return sorted;
}
export function sourceColor(source: string) {
  const s = source.toLowerCase();
  if (s.includes('reddit')) return '#FF4500';
  if (s.includes('hacker')) return '#FF6600';
  if (s.includes('remoteok')) return '#0ea5e9';
  if (s.includes('wework')) return '#16a34a';
  if (s.includes('indie')) return '#7c3aed';
  return '#2563eb';
}
