import { useEffect, useState } from 'react';
import { Download, FileText, RefreshCw } from 'lucide-react';

const apiUrl = (import.meta.env.VITE_API_URL ?? '/api/frac').replace(/\/$/, '');
type Document = { type: string; name: string | null };
type Submission = { id: string; reference: string | null; company: string; well: string | null; job_date: string | null; submitted_at: string | null; submitted_by: string | null; documents: Document[] };

export function Submissions({ accessToken, onBack, title = 'Submitted frac jobs' }: { accessToken: string; onBack: () => void; title?: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState('');
  const load = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/frac-jobs/submissions`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const payload = await response.json() as { submissions?: Submission[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Unable to load submissions.');
      setSubmissions(payload.submissions ?? []); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load submissions.'); }
  };
  useEffect(() => { void load(); }, [accessToken]);
  const download = async (jobId: string, document: Document) => {
    try {
      const response = await fetch(`${apiUrl}/api/frac-jobs/${jobId}/documents/${document.type}/download`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) throw new Error('Unable to open attachment.');
      const url = URL.createObjectURL(await response.blob());
      window.open(url, '_blank', 'noopener');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to open attachment.'); }
  };
  return <main className="min-h-screen bg-ink-100 p-4 sm:p-8"><div className="mx-auto max-w-6xl"><header className="mb-6 flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-ink-900">{title}</h1><p className="text-sm text-ink-500">View submitted jobs and their report attachments.</p></div><div className="flex gap-2"><button className="btn-secondary" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button><button className="btn-danger" onClick={onBack}>Back</button></div></header><div className="card overflow-x-auto p-4"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Reference</th><th>Company</th><th>Well</th><th>Submitted by</th><th>Attachments</th></tr></thead><tbody>{submissions.map((job) => <tr key={job.id} className="border-b border-ink-100"><td className="p-2">{job.reference ?? '—'}</td><td>{job.company}</td><td>{job.well ?? '—'}</td><td>{job.submitted_by ?? '—'}</td><td className="py-2">{job.documents.length ? job.documents.map((document) => <button key={document.type} className="btn-ghost mr-2" title={document.name ?? 'Report'} onClick={() => void download(job.id, document)}><FileText size={15} /> <Download size={14} /></button>) : '—'}</td></tr>)}</tbody></table>{!submissions.length && <p className="p-4 text-sm text-ink-500">No submitted jobs found.</p>}</div>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}</div></main>;
}
