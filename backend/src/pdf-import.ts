import { execFile } from 'node:child_process';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface FracImportData {
  mainFracData: {
    wellInfo: Record<string, string | number | boolean | null>;
    reports: Record<string, string | boolean | null>;
    reservoir: Record<string, string | number | null>;
  };
}

const clean = (value: string | undefined) => value?.replace(/\s+/g, ' ').trim() ?? '';
const number = (value: string | undefined) => {
  const parsed = Number((value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};
// Reports use either "Field: Raml", "Field = Raml", or table columns such as "Field            Raml".
const match = (text: string, label: string) => clean(text.match(new RegExp(`\\b${label}(?:[ \\t]*[:=#-][ \\t]*|[ \\t]{2,})([^\\n\\r]+)`, 'i'))?.[1]);

/** Extracts embedded PDF text. Image-only PDFs need a system OCR engine such as Tesseract. */
export async function importFracPdf(content: Buffer): Promise<{ text: string; data: FracImportData; warnings: string[] }> {
  const directory = await mkdtemp(path.join(tmpdir(), 'frac-pdf-'));
  const source = path.join(directory, 'source.pdf');
  try {
    await writeFile(source, content, { flag: 'wx' });
    const { stdout } = await execFileAsync('pdftotext', ['-layout', source, '-'], { maxBuffer: 10 * 1024 * 1024, timeout: 30_000 });
    let text = stdout.trim();
    const warnings: string[] = [];
    if (!text) {
      try {
        const pagePrefix = path.join(directory, 'page');
        await execFileAsync('pdftoppm', ['-png', '-r', '200', '-f', '1', '-l', '5', source, pagePrefix], { timeout: 60_000 });
        const pages = (await readdir(directory)).filter((file) => /^page-\d+\.png$/i.test(file)).sort();
        const recognized = await Promise.all(pages.map(async (page) => (await execFileAsync('tesseract', [path.join(directory, page), 'stdout', '-l', 'eng'], { maxBuffer: 10 * 1024 * 1024, timeout: 60_000 })).stdout));
        text = recognized.join('\n').trim();
        if (text) warnings.push('The PDF was scanned with OCR. Please verify imported values against the original report.');
      } catch {
        warnings.push('No embedded text was found. This appears to be a scanned PDF and requires Tesseract OCR to be installed on the API server.');
      }
    }
    const rigName = match(text, 'rig(?:\s*name)?');
    const data: FracImportData = {
      mainFracData: {
        wellInfo: {
          well: match(text, 'well(?:\s*name)?'),
          wellEug: match(text, '(?:well\s*)?(?:eug|uwi|api(?:\s*number)?)'),
          field: match(text, 'field'),
          regionArea: match(text, '(?:well\s*location|region(?:\s*\/\s*area)?|area|location)'),
          jobDate: match(text, '(?:job|frac)(?:\s*date)?|date'),
          onOffShore: match(text, '(?:on|off)[ -]?shore'),
          fracVendor: match(text, '(?:frac\s*)?(?:vendor|company)'),
          rigName,
          hasRigName: Boolean(rigName),
          latitude: number(match(text, 'latitude')),
          longitude: number(match(text, 'longitude')),
        },
        reports: { technique: match(text, '(?:frac\s*)?technique'), jobDesignReport: null, postFracReport: null },
        reservoir: {
          formationName: match(text, 'formation'), lithology: match(text, 'lithology'), wellType: match(text, 'well\s*type'),
          padPercent: number(match(text, 'pad\s*(?:percent|%)')), midPerfTVD: number(match(text, '(?:mid\s*perf\s*)?tvd')),
          numberOfPerfs: number(match(text, '(?:number\s*of\s*)?perforations?')), maxDeviation: number(match(text, 'max(?:imum)?\s*deviation')),
          averageReservoirPressure: number(match(text, '(?:average\s*)?reservoir\s*pressure')), bhst: number(match(text, 'bhst')),
          averagePorosity: number(match(text, '(?:average\s*)?porosity')),
        },
      },
    };
    return { text, data, warnings };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
