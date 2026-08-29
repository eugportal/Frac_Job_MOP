import type { FracFormData } from '@/types/fracTypes';

// const apiUrl = (import.meta.env.VITE_API_URL ?? '/api/frac').replace(/\/$/, '');
const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

type ImportedData = { mainFracData?: { wellInfo?: Partial<FracFormData['mainFracData']['wellInfo']>; reports?: Partial<FracFormData['mainFracData']['reports']>; reservoir?: Partial<FracFormData['mainFracData']['reservoir']> } };

export async function importFracPdf(accessToken: string, file: File): Promise<{ data: ImportedData; warnings: string[] }> {
  const body = new FormData();
  body.append('pdf', file, file.name);
  const response = await fetch(`${apiUrl}/api/frac-imports/pdf`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body });
  const payload = await response.json().catch(() => ({})) as { data?: ImportedData; warnings?: string[]; message?: string };
  if (!response.ok || !payload.data) throw new Error(payload.message ?? 'Unable to import the PDF.');
  return { data: payload.data, warnings: payload.warnings ?? [] };
}
