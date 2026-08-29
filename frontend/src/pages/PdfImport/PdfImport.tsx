import { useState, type ReactNode } from 'react';
import { FileText, LogOut, Upload } from 'lucide-react';
import type { FracFormData } from '@/types/fracTypes';
import { createInitialFormState } from '@/utils/initialState';
import { importFracPdf } from '@/services/pdfImportService';

interface PdfImportProps { company: string; accessToken: string; onContinue: (data?: FracFormData) => void; onLogout: () => void; themeToggle: ReactNode; }

export function PdfImport({ company, accessToken, onContinue, onLogout, themeToggle }: PdfImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importedData, setImportedData] = useState<FracFormData | null>(null);

  const importFile = async () => {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const result = await importFracPdf(accessToken, file);
      const base = createInitialFormState();
      const data: FracFormData = {
        ...base, company,
        mainFracData: {
          ...base.mainFracData,
          wellInfo: { ...base.mainFracData.wellInfo, ...result.data.mainFracData?.wellInfo },
          reports: { ...base.mainFracData.reports, ...result.data.mainFracData?.reports },
          reservoir: { ...base.mainFracData.reservoir, ...result.data.mainFracData?.reservoir },
          workbookFields: { ...base.mainFracData.workbookFields, company },
        },
      };
      setWarnings(result.warnings);
      setImportedData(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to import this PDF.'); }
    finally { setLoading(false); }
  };

  return <main className="min-h-screen bg-ink-100 p-4 sm:p-8"><div className="mx-auto max-w-xl"><header className="mb-8 flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-brand-600">{company}</p><h1 className="text-2xl font-bold text-ink-900">Start from a PDF</h1><p className="mt-1 text-sm text-ink-500">Upload a frac report and we’ll prefill the fields we can identify. Review every value before submitting.</p></div><div className="flex gap-1">{themeToggle}<button className="btn-ghost" onClick={onLogout} title="Sign out"><LogOut size={17} /></button></div></header><section className="card p-6"><label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-brand-300 px-6 py-10 text-center hover:bg-brand-50"><Upload className="mb-3 text-brand-600" size={30} /><span className="font-semibold text-ink-800">Choose a PDF report</span><span className="mt-1 text-xs text-ink-500">PDF only, up to 50 MB</span><input className="hidden" type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setWarnings([]); setImportedData(null); setError(''); }} /></label>{file && <p className="mt-4 flex items-center gap-2 text-sm text-ink-700"><FileText size={16} />{file.name}</p>}{error && <p className="mt-4 text-sm text-red-600">{error}</p>}{warnings.map((warning) => <p key={warning} className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{warning}</p>)}<div className="mt-6 flex justify-end gap-3"><button className="btn-secondary" onClick={() => onContinue()}>Enter form manually</button>{importedData ? <button className="btn-primary" onClick={() => onContinue(importedData)}>Continue to form</button> : <button className="btn-primary" disabled={!file || loading} onClick={() => void importFile()}>{loading ? 'Reading PDF…' : 'Import PDF'}</button>}</div></section></div></main>;
}
