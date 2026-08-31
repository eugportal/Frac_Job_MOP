const apiUrl = (import.meta.env.VITE_API_URL ?? '/api/frac').replace(/\/$/, '');
// const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
export type LookupType = 'fields' | 'wells' | 'vendors' | 'techniques';
export interface LookupData { companies: Item[]; fields: Item[]; wells: WellItem[]; vendors: Item[]; techniques: TechniqueItem[]; }
export interface Item { id: string; name: string; }
export interface WellItem extends Item { uwi: string | null; field_id: string | null; }
export interface TechniqueItem extends Item { vendor_ids: string[]; }

async function request(token: string, path: string, init?: RequestInit) {
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } });
  const payload = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(payload.message ?? 'Administration request failed.');
  return payload;
}
export const adminLookups = {
  companies: async (token: string) => (await request(token, '/api/admin/companies') as { companies: Item[] }).companies,
  load: (token: string, companyId: string) => request(token, `/api/admin/lookup-data?companyId=${encodeURIComponent(companyId)}`) as Promise<LookupData>,
  save: (token: string, type: LookupType, item: Record<string, unknown>, id?: string) => request(token, `/api/admin/lookups/${type}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }),
  remove: (token: string, type: LookupType, id: string, companyId: string) => request(token, `/api/admin/lookups/${type}/${id}?companyId=${encodeURIComponent(companyId)}`, { method: 'DELETE' }),
  import: (token: string, type: LookupType, companyId: string, file: File) => request(token, `/api/admin/lookups/${type}/import`, { method: 'POST', headers: { 'Content-Type': file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'X-Company-Id': companyId }, body: file }),
};
