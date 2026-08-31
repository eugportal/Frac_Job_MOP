import * as XLSX from 'xlsx';
import { database } from './database.js';

export class LookupAdminError extends Error {
  constructor(public readonly statusCode: number, message: string) { super(message); }
}

const scopedTypes = new Set(['fields', 'wells']);
const globalTypes = new Set(['vendors', 'techniques']);
export type LookupType = 'fields' | 'wells' | 'vendors' | 'techniques';

function typeOrThrow(value: string): LookupType {
  if (!scopedTypes.has(value) && !globalTypes.has(value)) throw new LookupAdminError(400, 'Unsupported lookup type.');
  return value as LookupType;
}
function cleanName(value: unknown, label = 'Name') {
  if (typeof value !== 'string' || !value.trim()) throw new LookupAdminError(400, `${label} is required.`);
  return value.trim();
}

export async function listAdminLookupData(companyId: string) {
  const [companies, fields, wells, vendors, techniques] = await Promise.all([
    database.query<{ id: string; name: string }>('select id, name from public.companies order by name'),
    database.query<{ id: string; name: string }>('select id, name from public.fields where company_id = $1 order by name', [companyId]),
    database.query<{ id: string; name: string; well_eug: string | null; field_id: string | null }>('select id, name, well_eug, field_id from public.wells where company_id = $1 order by name', [companyId]),
    database.query<{ id: string; name: string }>('select id, name from public.frac_vendors order by name'),
    database.query<{ id: string; name: string; vendor_ids: string[] }>(`select t.id, t.name, coalesce(array_agg(vt.frac_vendor_id) filter (where vt.frac_vendor_id is not null), '{}') as vendor_ids from public.techniques t left join public.frac_vendor_techniques vt on vt.technique_id=t.id group by t.id, t.name order by t.name`),
  ]);
  return { companies: companies.rows, fields: fields.rows, wells: wells.rows, vendors: vendors.rows, techniques: techniques.rows };
}

export async function createLookup(typeValue: string, input: { companyId?: unknown; name?: unknown; wellEug?: unknown; fieldId?: unknown; vendorIds?: unknown }) {
  const type = typeOrThrow(typeValue); const name = cleanName(input.name);
  const client = await database.connect();
  try {
    await client.query('begin'); let result;
    if (type === 'fields') {
      const companyId = cleanName(input.companyId, 'Company');
      result = await client.query('insert into public.fields (company_id,name) values ($1,$2) returning id,name', [companyId, name]);
    } else if (type === 'wells') {
      const companyId = cleanName(input.companyId, 'Company');
      result = await client.query('insert into public.wells (company_id,field_id,name,well_eug) values ($1,$2,$3,$4) returning id,name,well_eug,field_id', [companyId, input.fieldId || null, name, typeof input.wellEug === 'string' ? input.wellEug.trim() || null : null]);
    } else {
      const table = type === 'vendors' ? 'frac_vendors' : 'techniques';
      result = await client.query(`insert into public.${table} (name) values ($1) returning id,name`, [name]);
      if (type === 'techniques') await setTechniqueVendors(client, result.rows[0].id, input.vendorIds);
    }
    await client.query('commit'); return result.rows[0];
  } catch (error) { await client.query('rollback').catch(() => undefined); throw duplicateMessage(error); } finally { client.release(); }
}

export async function updateLookup(typeValue: string, id: string, input: { companyId?: unknown; name?: unknown; wellEug?: unknown; fieldId?: unknown; vendorIds?: unknown }) {
  const type = typeOrThrow(typeValue); const name = cleanName(input.name); const client = await database.connect();
  try {
    await client.query('begin'); let result;
    if (type === 'fields') result = await client.query('update public.fields set name=$1,updated_at=now() where id=$2 and company_id=$3 returning id,name', [name, id, cleanName(input.companyId, 'Company')]);
    else if (type === 'wells') result = await client.query('update public.wells set name=$1,well_eug=$2,field_id=$3,updated_at=now() where id=$4 and company_id=$5 returning id,name,well_eug,field_id', [name, typeof input.wellEug === 'string' ? input.wellEug.trim() || null : null, input.fieldId || null, id, cleanName(input.companyId, 'Company')]);
    else { const table = type === 'vendors' ? 'frac_vendors' : 'techniques'; result = await client.query(`update public.${table} set name=$1,updated_at=now() where id=$2 returning id,name`, [name, id]); if (type === 'techniques' && result.rows[0]) await setTechniqueVendors(client, id, input.vendorIds); }
    if (!result.rows[0]) throw new LookupAdminError(404, 'Lookup item not found.');
    await client.query('commit'); return result.rows[0];
  } catch (error) { await client.query('rollback').catch(() => undefined); throw duplicateMessage(error); } finally { client.release(); }
}

export async function deleteLookup(typeValue: string, id: string, companyId?: string) {
  const type = typeOrThrow(typeValue); const table = type === 'fields' ? 'fields' : type === 'wells' ? 'wells' : type === 'vendors' ? 'frac_vendors' : 'techniques';
  const result = scopedTypes.has(type) ? await database.query(`delete from public.${table} where id=$1 and company_id=$2 returning id`, [id, companyId]) : await database.query(`delete from public.${table} where id=$1 returning id`, [id]);
  if (!result.rows[0]) throw new LookupAdminError(404, 'Lookup item not found.');
}

async function setTechniqueVendors(client: { query: Function }, techniqueId: string, rawIds: unknown) {
  const vendorIds = Array.isArray(rawIds) ? rawIds.filter((id): id is string => typeof id === 'string') : [];
  await client.query('delete from public.frac_vendor_techniques where technique_id=$1', [techniqueId]);
  for (const vendorId of vendorIds) await client.query('insert into public.frac_vendor_techniques (frac_vendor_id,technique_id) values ($1,$2)', [vendorId, techniqueId]);
}

export async function importLookupWorkbook(typeValue: string, companyId: string | undefined, body: Buffer) {
  const type = typeOrThrow(typeValue); if (scopedTypes.has(type) && !companyId) throw new LookupAdminError(400, 'Company is required.');
  const workbook = XLSX.read(body, { type: 'buffer' }); const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new LookupAdminError(400, 'The workbook has no worksheet.');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (!rows.length) throw new LookupAdminError(400, 'The workbook has no data rows.');
  let created = 0; const client = await database.connect();
  try {
    await client.query('begin');
    for (const row of rows.slice(0, 1000)) {
      const name = String(row.Name || row.name || row.Well || row.well || row.Field || row.field || row.Technique || row.technique || row['Frac Vendor'] || row.vendor || '').trim();
      if (!name) continue;
      if (type === 'fields') await client.query('insert into public.fields (company_id,name) values ($1,$2) on conflict (company_id,name) do nothing', [companyId, name]);
      else if (type === 'wells') {
        const fieldName = String(row.Field || row.field || '').trim();
        const field = fieldName ? await client.query<{ id: string }>('select id from public.fields where company_id=$1 and name=$2', [companyId, fieldName]) : { rows: [] };
        await client.query('insert into public.wells (company_id,field_id,name,well_eug) values ($1,$2,$3,$4) on conflict (company_id,name) do update set well_eug=excluded.well_eug,field_id=excluded.field_id,updated_at=now()', [companyId, field.rows[0]?.id ?? null, name, String(row['Well EUG'] || row['Well EUG '] || row.uwi || row.UWI || '').trim() || null]);
      } else if (type === 'vendors') await client.query('insert into public.frac_vendors (name) values ($1) on conflict (name) do nothing', [name]);
      else await client.query('insert into public.techniques (name) values ($1) on conflict (name) do nothing', [name]);
      created++;
    }
    await client.query('commit'); return { processed: created, totalRows: rows.length };
  } catch (error) { await client.query('rollback').catch(() => undefined); throw duplicateMessage(error); } finally { client.release(); }
}

function duplicateMessage(error: unknown) {
  if (error instanceof LookupAdminError) return error;
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') return new LookupAdminError(409, 'An item with this name already exists.');
  return error;
}
