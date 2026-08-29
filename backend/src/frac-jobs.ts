import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { database } from './database.js';

export class FracJobError extends Error {
  constructor(public readonly statusCode: number, message: string) { super(message); }
}

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  companyId: string;
  companyName: string;
  role: 'admin' | 'editor' | 'viewer';
  isSuperuser: boolean;
}

export async function findSessionUser(username: string, email?: string): Promise<SessionUser | null> {
  const result = await database.query<SessionUser>(
    `select u.id, u.username, u.email, c.id as "companyId", c.name as "companyName", m.role, u.is_superuser as "isSuperuser"
       from public.app_users u
       join public.company_memberships m on m.user_id = u.id
       join public.companies c on c.id = m.company_id
      where u.username = $1 and u.is_active and ($2::text is null or u.email = $2)
      order by m.created_at asc`, [username, email ?? null],
  );
  if (result.rows.length === 0) return null;
  if (result.rows.length > 1) throw new FracJobError(409, 'This account has multiple companies. Assign exactly one company before signing in.');
  return result.rows[0];
}

function nullable(value: unknown) { return value === '' || value === undefined ? null : value; }
function asArray(value: unknown) { return Array.isArray(value) ? value : []; }
const removedWorkbookKeys = new Set([
  'youngsModulus', 'minHorizontalStress', 'poissonsRatio',
  'maxTreatingPressure', 'avgTreatingPressure', 'maxSlurryRate', 'avgSlurryRate', 'miniFracAvgHhp',
  'minifracBhisip', 'fg', 'cg', 'closurePressure', 'fluidEfficiency',
]);
function withoutRemovedWorkbookFields(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key]) => !removedWorkbookKeys.has(key)));
}

async function requireWell(client: PoolClient, companyId: string, wellName: unknown) {
  if (typeof wellName !== 'string' || !wellName.trim()) return null;
  const result = await client.query<{ id: string }>('select id from public.wells where company_id = $1 and name = $2', [companyId, wellName]);
  if (!result.rows[0]) throw new FracJobError(400, 'The selected well does not belong to your company.');
  return result.rows[0].id;
}

async function requireField(client: PoolClient, companyId: string, fieldName: unknown) {
  if (typeof fieldName !== 'string' || !fieldName.trim()) return null;
  const result = await client.query<{ id: string }>('select id from public.fields where company_id = $1 and name = $2', [companyId, fieldName]);
  if (!result.rows[0]) throw new FracJobError(400, 'The selected field does not belong to your company.');
  return result.rows[0].id;
}

export async function saveFracJob(user: SessionUser, form: any, submit: boolean, allowSubmittedEdit = false) {
  const main = form.mainFracData ?? {};
  const wellInfo = main.wellInfo ?? {};
  const reports = main.reports ?? {};
  const reservoir = main.reservoir ?? {};
  const completion = form.completionData ?? {};
  const jobCost = form.jobCost ?? {};
  const jobId = typeof form.formId === 'string' && /^[0-9a-f-]{36}$/i.test(form.formId) ? form.formId : randomUUID();
  const client = await database.connect();
  try {
    await client.query('begin');
    const existing = await client.query<{ id: string; status: string; company_id: string; company_name: string }>(
      `select j.id, j.status, j.company_id, c.name as company_name
         from public.frac_jobs j join public.companies c on c.id = j.company_id
        where j.id = $1 for update`,
      [jobId],
    );
    const existingJob = existing.rows[0];
    const companyId = existingJob?.company_id ?? user.companyId;
    const companyName = existingJob?.company_name ?? user.companyName;
    if (existingJob && existingJob.company_id !== user.companyId && !user.isSuperuser) throw new FracJobError(404, 'Form not found for your company.');
    if (existingJob?.status === 'submitted' && !allowSubmittedEdit) throw new FracJobError(409, 'Submitted forms can only be changed by an administrator.');
    const wellId = await requireWell(client, companyId, wellInfo.well);
    const fieldId = await requireField(client, companyId, wellInfo.field);
    const status = existingJob?.status === 'submitted' ? 'submitted' : (submit ? 'submitted' : (form.status === 'in-progress' ? 'in_progress' : 'draft'));
    const job = await client.query<{ id: string; reference: string | null; submitted_at: string | null }>(
      `insert into public.frac_jobs (id, company_id, well_id, field_id, status, job_date, submitted_at, submitted_by, created_by,
           data_source_confidence, frac_vendor, technique, job_cost_enabled, job_cost_skipped, completion_enabled, completion_skipped)
       values ($1,$2,$3,$4,$5::public.job_status,$6,case when $5::public.job_status = 'submitted'::public.job_status then now() else null end,case when $5::public.job_status = 'submitted'::public.job_status then $7::uuid else null end,$7::uuid,$8,$9,$10,$11,$12,$13,$14)
       on conflict (id) do update set well_id=excluded.well_id, field_id=excluded.field_id, status=excluded.status, job_date=excluded.job_date,
           submitted_at=case when public.frac_jobs.status = 'submitted' then public.frac_jobs.submitted_at when excluded.status = 'submitted' then now() else null end,
           submitted_by=case when public.frac_jobs.status = 'submitted' then public.frac_jobs.submitted_by when excluded.status = 'submitted' then $7 else null end, data_source_confidence=excluded.data_source_confidence,
           frac_vendor=excluded.frac_vendor, technique=excluded.technique, job_cost_enabled=excluded.job_cost_enabled,
           job_cost_skipped=excluded.job_cost_skipped, completion_enabled=excluded.completion_enabled, completion_skipped=excluded.completion_skipped
       where public.frac_jobs.company_id = $2
       returning id, reference, submitted_at`,
      [jobId, companyId, wellId, fieldId, status, nullable(wellInfo.jobDate), user.id, nullable(wellInfo.dataSourceConfidence), nullable(wellInfo.fracVendor), nullable(reports.technique), !!jobCost.enabled, !!jobCost.skipped, !!completion.enabled, !!completion.skipped],
    );
    if (!job.rows[0]) throw new FracJobError(404, 'Form not found for your company.');
    await client.query(
      `insert into public.job_reservoir_details (job_id, formation_name, lithology, well_type, pad_percent, mid_perf_tvd, number_of_perforations, max_deviation, average_reservoir_pressure, bhst, average_porosity, workbook_data)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       on conflict (job_id) do update set formation_name=excluded.formation_name, lithology=excluded.lithology, well_type=excluded.well_type, pad_percent=excluded.pad_percent, mid_perf_tvd=excluded.mid_perf_tvd, number_of_perforations=excluded.number_of_perforations, max_deviation=excluded.max_deviation, average_reservoir_pressure=excluded.average_reservoir_pressure, bhst=excluded.bhst, average_porosity=excluded.average_porosity, workbook_data=excluded.workbook_data`,
      [jobId, nullable(reservoir.formationName), nullable(reservoir.lithology), nullable(reservoir.wellType), nullable(reservoir.padPercent), nullable(reservoir.midPerfTVD), nullable(reservoir.numberOfPerfs), nullable(reservoir.maxDeviation), nullable(reservoir.averageReservoirPressure), nullable(reservoir.bhst), nullable(reservoir.averagePorosity), JSON.stringify({ ...withoutRemovedWorkbookFields(main.workbookFields), wellEug: wellInfo.wellEug, field: wellInfo.field, regionArea: wellInfo.regionArea, latitude: wellInfo.latitude, longitude: wellInfo.longitude, onOffShore: wellInfo.onOffShore, hasRigName: !!wellInfo.hasRigName, rigName: wellInfo.hasRigName ? wellInfo.rigName : null, reports })],
    );
    await client.query('delete from public.job_stages where job_id = $1', [jobId]);
    for (const stage of asArray(main.stages)) await client.query(
      'insert into public.job_stages (job_id, stage_number, perf_top, perf_bottom, pad_percent, fluid_volume, proppant_amount, rate, pressure) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [jobId, stage.stage, nullable(stage.perfTop), nullable(stage.perfBottom), nullable(stage.padPercent), nullable(stage.fluidVolume), nullable(stage.proppantAmount), nullable(stage.rate), nullable(stage.pressure)],
    );
    await client.query('delete from public.job_completion_records where job_id = $1', [jobId]);
    for (const record of asArray(completion.records)) await client.query(
      `insert into public.job_completion_records (job_id, well_name_uwi, well_type, casing_size, tubing_dp_size, tubing_dp_grade, perf_interval_top, perf_interval_bottom, entrance_hole_size, completion_type, prior_workovers, triple_compo_log, cpi_log, workbook_data)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [jobId, record.wellNameUWI || wellInfo.well || 'Not provided', record.wellType || 'Not provided', nullable(record.casingSize), nullable(record.tubingDPSize), nullable(record.tubingDPGrade), nullable(record.perfIntervalTop), nullable(record.perfIntervalBottom), nullable(record.entranceHoleSize), nullable(record.completionType), nullable(record.priorWorkovers), nullable(record.tripleCompoLog), nullable(record.cpiLog), JSON.stringify(record.workbookFields ?? {})],
    );
    await client.query(
      `insert into public.job_cost_details (job_id, frac_cost, fracpack_cost, job_operating_days, job_standby_days, acid_considered, acid_cost, ct_cleaning_cost, ct_lifting_cost, additional_cost)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (job_id) do update set frac_cost=excluded.frac_cost, fracpack_cost=excluded.fracpack_cost, job_operating_days=excluded.job_operating_days, job_standby_days=excluded.job_standby_days, acid_considered=excluded.acid_considered, acid_cost=excluded.acid_cost, ct_cleaning_cost=excluded.ct_cleaning_cost, ct_lifting_cost=excluded.ct_lifting_cost, additional_cost=excluded.additional_cost`,
      [jobId, nullable(jobCost.fracCost), nullable(jobCost.fracpackCost), nullable(jobCost.jobOperatingDays), nullable(jobCost.jobStandbyDays), jobCost.acidConsidered ?? null, nullable(jobCost.acidCost), nullable(jobCost.ctCleaningCost), nullable(jobCost.ctLiftingCost), nullable(jobCost.additionalCost)],
    );
    if (submit && !job.rows[0].reference) await client.query(`update public.frac_jobs set reference = 'FRAC-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(id::text, '-', ''), 1, 6)) where id = $1`, [jobId]);
    if (existingJob?.status === 'submitted' && allowSubmittedEdit) {
      await client.query(
        `insert into public.frac_job_edit_log (job_id, edited_by, edit_type) values ($1, $2, 'admin_edit')`,
        [jobId, user.id],
      );
    }
    const final = await client.query<{ reference: string; submitted_at: string | null }>('select reference, submitted_at from public.frac_jobs where id = $1', [jobId]);
    await client.query('commit');
    const jobTotal = ['fracCost', 'fracpackCost', 'acidCost', 'ctCleaningCost', 'ctLiftingCost', 'additionalCost']
      .reduce((sum, key) => sum + (Number(jobCost[key]) || 0), 0);
    return { formId: jobId, reference: final.rows[0].reference, submittedAt: final.rows[0].submitted_at, company: companyName, well: wellInfo.well ?? '', jobDate: wellInfo.jobDate ?? '', jobTotal: Math.round(jobTotal * 100) / 100 };
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

function numberOrNull(value: unknown) { return value === null || value === undefined ? null : Number(value); }
function objectOrEmpty(value: unknown): Record<string, any> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}; }

export async function loadFracJob(user: SessionUser, jobId: string) {
  const scope = user.isSuperuser ? '' : ' and j.company_id = $2';
  const params = user.isSuperuser ? [jobId] : [jobId, user.companyId];
  const job = await database.query<any>(
    `select j.*, c.name as company, w.name as well, w.uwi as well_eug, f.name as field,
            r.formation_name, r.lithology, r.well_type as reservoir_well_type, r.pad_percent, r.mid_perf_tvd,
            r.number_of_perforations, r.max_deviation, r.average_reservoir_pressure, r.bhst, r.average_porosity,
            r.workbook_data, d.frac_cost, d.fracpack_cost, d.job_operating_days, d.job_standby_days, d.acid_considered,
            d.acid_cost, d.ct_cleaning_cost, d.ct_lifting_cost, d.additional_cost
       from public.frac_jobs j join public.companies c on c.id = j.company_id
       left join public.wells w on w.id = j.well_id left join public.fields f on f.id = j.field_id
       left join public.job_reservoir_details r on r.job_id = j.id left join public.job_cost_details d on d.job_id = j.id
      where j.id = $1${scope}`,
    params,
  );
  const row = job.rows[0];
  if (!row) throw new FracJobError(404, 'Submission not found.');
  const stages = await database.query<any>('select id, stage_number, perf_top, perf_bottom, pad_percent, fluid_volume, proppant_amount, rate, pressure from public.job_stages where job_id = $1 order by stage_number', [jobId]);
  const completions = await database.query<any>('select id, well_name_uwi, well_type, casing_size, tubing_dp_size, tubing_dp_grade, perf_interval_top, perf_interval_bottom, entrance_hole_size, completion_type, prior_workovers, triple_compo_log, cpi_log, workbook_data from public.job_completion_records where job_id = $1 order by created_at', [jobId]);
  const workbook = objectOrEmpty(row.workbook_data);
  const reports = objectOrEmpty(workbook.reports);
  return {
    company: row.company,
    companyId: row.company_id,
    formId: row.id,
    status: row.status === 'in_progress' ? 'in-progress' : row.status,
    lastModified: row.updated_at?.toISOString?.() ?? String(row.updated_at ?? new Date().toISOString()),
    mainFracData: {
      wellInfo: { well: row.well ?? '', wellEug: workbook.wellEug ?? row.well_eug ?? '', field: workbook.field ?? row.field ?? '', regionArea: workbook.regionArea ?? '', latitude: numberOrNull(workbook.latitude), longitude: numberOrNull(workbook.longitude), jobDate: row.job_date ? String(row.job_date).slice(0, 10) : '', onOffShore: workbook.onOffShore ?? '', fracVendor: row.frac_vendor ?? '', hasRigName: !!workbook.hasRigName, rigName: workbook.rigName ?? '', dataSourceConfidence: row.data_source_confidence ?? '' },
      reports: { jobDesignReport: reports.jobDesignReport ?? null, postFracReport: reports.postFracReport ?? null, jobDesignReportAttachment: reports.jobDesignReportAttachment ?? null, postFracReportAttachment: reports.postFracReportAttachment ?? null, technique: row.technique ?? reports.technique ?? '' },
      reservoir: { formationName: row.formation_name ?? '', lithology: row.lithology ?? '', wellType: row.reservoir_well_type ?? '', padPercent: numberOrNull(row.pad_percent), midPerfTVD: numberOrNull(row.mid_perf_tvd), numberOfPerfs: numberOrNull(row.number_of_perforations), maxDeviation: numberOrNull(row.max_deviation), averageReservoirPressure: numberOrNull(row.average_reservoir_pressure), bhst: numberOrNull(row.bhst), averagePorosity: numberOrNull(row.average_porosity) },
      stages: stages.rows.map((stage: any) => ({ id: stage.id, stage: stage.stage_number, perfTop: numberOrNull(stage.perf_top), perfBottom: numberOrNull(stage.perf_bottom), padPercent: numberOrNull(stage.pad_percent), fluidVolume: numberOrNull(stage.fluid_volume), proppantAmount: numberOrNull(stage.proppant_amount), rate: numberOrNull(stage.rate), pressure: numberOrNull(stage.pressure) })),
      workbookFields: Object.fromEntries(Object.entries(workbook).filter(([key]) => !['wellEug', 'field', 'regionArea', 'latitude', 'longitude', 'onOffShore', 'hasRigName', 'rigName', 'reports'].includes(key))),
    },
    completionData: { enabled: row.completion_enabled, skipped: row.completion_skipped, records: completions.rows.map((record: any) => ({ id: record.id, wellNameUWI: record.well_name_uwi, wellType: record.well_type, casingSize: numberOrNull(record.casing_size), tubingDPSize: numberOrNull(record.tubing_dp_size), tubingDPGrade: record.tubing_dp_grade ?? '', perfIntervalTop: numberOrNull(record.perf_interval_top), perfIntervalBottom: numberOrNull(record.perf_interval_bottom), entranceHoleSize: numberOrNull(record.entrance_hole_size), completionType: record.completion_type ?? '', priorWorkovers: numberOrNull(record.prior_workovers), tripleCompoLog: record.triple_compo_log ?? '', cpiLog: record.cpi_log ?? '', workbookFields: objectOrEmpty(record.workbook_data) })) },
    jobCost: { enabled: row.job_cost_enabled, skipped: row.job_cost_skipped, fracCost: numberOrNull(row.frac_cost), fracpackCost: numberOrNull(row.fracpack_cost), jobOperatingDays: numberOrNull(row.job_operating_days), jobStandbyDays: numberOrNull(row.job_standby_days), acidConsidered: row.acid_considered, acidCost: numberOrNull(row.acid_cost), ctCleaningCost: numberOrNull(row.ct_cleaning_cost), ctLiftingCost: numberOrNull(row.ct_lifting_cost), additionalCost: numberOrNull(row.additional_cost) },
  };
}
