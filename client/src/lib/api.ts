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

export type Group = {
  dateKey: string;
  count: number;
  sources: string[];
  firstDate: string;
  lastDate: string;
  label: string;
  fullLabel: string;
  time: string;
  time24: string;
  iso: string;
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
  dateFrom?: string;
  dateTo?: string;
}): Promise<LeadsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.source && params.source !== 'All') qs.set('source', params.source);
  if (params.country && params.country !== 'All') qs.set('country', params.country);
  if (params.status && params.status !== 'All') qs.set('status', params.status);
  if (params.sort) qs.set('sort', params.sort);
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  return req(`/api/leads?${qs.toString()}`);
}

export async function fetchGroups(params: {
  search?: string;
  source?: string;
  country?: string;
  status?: string;
}): Promise<Group[]> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.source && params.source !== 'All') qs.set('source', params.source);
  if (params.country && params.country !== 'All') qs.set('country', params.country);
  if (params.status && params.status !== 'All') qs.set('status', params.status);
  const q = qs.toString();
  return req(`/api/leads/groups${q ? `?${q}` : ''}`);
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

export function formatIST(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Kolkata' });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) + ' IST';
  const fullDate = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  return { date, time, fullDate };
}
export function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Kolkata' });
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
