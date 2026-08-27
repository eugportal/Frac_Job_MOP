// Service abstraction. Initially backed by localStorage; a future API can replace these implementations.

import type { DocumentAttachment, FracDataService, FracFormData, SubmissionResult } from '@/types/fracTypes';
import { computeJobCostBreakdown } from '@/utils/calculations';
import { generateReferenceNumber } from '@/utils/formatters';
import {
  clearDraftFromStorage,
  loadDraftFromStorage,
  saveSubmission,
  saveDraftToStorage,
} from '@/utils/storage';

// const apiUrl = (import.meta.env.VITE_API_URL ?? '/api/frac').replace(/\/$/, '');
const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

async function saveToApi(accessToken: string, path: string, data: FracFormData): Promise<SubmissionResult> {
  const { jobDesignReportAttachment, postFracReportAttachment, ...reports } = data.mainFracData.reports;
  const payloadData = { ...data, mainFracData: { ...data.mainFracData, reports: { ...reports, jobDesignReportAttachment: stripFile(jobDesignReportAttachment), postFracReportAttachment: stripFile(postFracReportAttachment) } } };
  const response = await fetch(`${apiUrl}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payloadData) });
  const payload = await response.json().catch(() => ({})) as { message?: string; job?: SubmissionResult };
  if (!response.ok || !payload.job) throw new Error(payload.message ?? 'Unable to save the frac job.');
  return payload.job;
}

function stripFile(attachment: FracFormData['mainFracData']['reports']['jobDesignReportAttachment']) {
  if (!attachment) return null;
  const metadata = { ...attachment };
  delete metadata.file;
  return metadata;
}

async function uploadSelectedReports(accessToken: string, jobId: string, data: FracFormData) {
  const documents: Array<[string, DocumentAttachment | null, string]> = [
    ['job_design_report', data.mainFracData.reports.jobDesignReportAttachment, 'Job Design Report'],
    ['post_frac_report', data.mainFracData.reports.postFracReportAttachment, 'Post Frac Report'],
  ];
  for (const [type, attachment, label] of documents) {
    if (!attachment) continue;
    const file = attachment.file;
    if (!(file instanceof Blob)) throw new Error(`${label} must be selected again before uploading. Browser drafts retain file details, not the file itself.`);
    const body = new FormData();
    body.append('reportFile', file, attachment.name);
    const response = await fetch(`${apiUrl}/api/frac-jobs/${jobId}/documents/${type}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(payload.message ?? 'Unable to upload the report.');
    }
  }
}

export function createFracDataService(accessToken: string): FracDataService {
  return {
    async saveDraft(data) { const job = await saveToApi(accessToken, '/api/frac-jobs/drafts', data); await uploadSelectedReports(accessToken, job.formId, data); },
    async loadDraft() { return null; },
    async clearDraft() { clearDraftFromStorage(); },
    async submit(data) { const job = await saveToApi(accessToken, '/api/frac-jobs/submit', data); await uploadSelectedReports(accessToken, job.formId, data); clearDraftFromStorage(); return job; },
  };
}

export async function getCompanyWells(accessToken: string): Promise<Array<{ value: string; label: string; uwi: string | null }>> {
  const response = await fetch(`${apiUrl}/api/companies/me/wells`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = await response.json().catch(() => ({})) as { message?: string; wells?: Array<{ name: string; uwi: string | null }> };
  if (!response.ok) throw new Error(payload.message ?? 'Unable to load company wells.');
  return (payload.wells ?? []).map((well) => ({ value: well.name, label: well.name, uwi: well.uwi }));
}

export async function getCompanyFields(accessToken: string): Promise<Array<{ value: string; label: string }>> {
  const response = await fetch(`${apiUrl}/api/companies/me/fields`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = await response.json().catch(() => ({})) as { message?: string; fields?: Array<{ name: string }> };
  if (!response.ok) throw new Error(payload.message ?? 'Unable to load company fields.');
  return (payload.fields ?? []).map((field) => ({ value: field.name, label: field.name }));
}

export async function getFracOptions(accessToken: string): Promise<Record<string, Array<{ value: string; label: string }>>> {
  const response = await fetch(`${apiUrl}/api/companies/me/frac-options`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = await response.json().catch(() => ({})) as { message?: string; options?: Array<{ vendor: string; technique: string | null }> };
  if (!response.ok) throw new Error(payload.message ?? 'Unable to load frac options.');
  return (payload.options ?? []).reduce<Record<string, Array<{ value: string; label: string }>>>((groups, option) => {
    groups[option.vendor] ??= [];
    if (option.technique) groups[option.vendor].push({ value: option.technique, label: option.technique });
    return groups;
  }, {});
}

export const localFracDataService: FracDataService = {
  async saveDraft(data: FracFormData): Promise<void> {
    saveDraftToStorage({ ...data, lastModified: new Date().toISOString(), status: 'draft' });
  },

  async loadDraft(): Promise<FracFormData | null> {
    return loadDraftFromStorage();
  },

  async clearDraft(): Promise<void> {
    clearDraftFromStorage();
  },

  async submit(data: FracFormData): Promise<SubmissionResult> {
    const reference = generateReferenceNumber();
    const submittedAt = new Date().toISOString();
    const breakdown = computeJobCostBreakdown(data.jobCost);

    saveSubmission({
      reference,
      submittedAt,
      data: { ...data, status: 'submitted' },
    });

    // Clear the draft once submitted
    clearDraftFromStorage();

    return {
      reference,
      submittedAt,
      company: data.company || 'Unknown',
      well: data.mainFracData.wellInfo.well,
      jobDate: data.mainFracData.wellInfo.jobDate,
      jobTotal: breakdown.total,
    };
  },
};
