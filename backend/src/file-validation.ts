import yauzl from 'yauzl';
import path from 'node:path';

const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const MAX_ARCHIVE_ENTRIES = 2_000;
const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;

export async function validateReportFile(fileName: string, content: Buffer) {
  const extension = path.extname(fileName).toLowerCase();
  if (!['.pdf', '.doc', '.docx', '.xls', '.xlsx','.zip'].includes(extension)) throw new Error('Only PDF, DOC, DOCX, XLS, and XLSX report files are allowed.');
  if (content.length === 0) throw new Error('The uploaded file is empty.');
  if (extension === '.pdf') {
    if (!content.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('The file is not a valid PDF document.');
    return;
  }
  if (extension === '.doc' || extension === '.xls') {
    if (!content.subarray(0, OLE_SIGNATURE.length).equals(OLE_SIGNATURE)) throw new Error('The file is not a valid legacy Word or Excel document.');
    return;
  }
  if (!content.subarray(0, ZIP_SIGNATURE.length).equals(ZIP_SIGNATURE)) throw new Error('The file is not a valid Office document.');
  const expectedFolder = extension === '.docx' ? 'word/' : 'xl/';
  await validateOfficeZip(content, expectedFolder);
}

function validateOfficeZip(content: Buffer, expectedFolder: string) {
  return new Promise<void>((resolve, reject) => {
    yauzl.fromBuffer(content, { lazyEntries: true, validateEntrySizes: true }, (openError, zip) => {
      if (openError || !zip) return reject(new Error('The Office document archive is invalid.'));
      let entries = 0; let totalSize = 0; let hasExpectedFolder = false;
      zip.on('error', () => reject(new Error('The Office document archive is invalid.')));
      zip.on('entry', (entry) => {
        entries++; totalSize += entry.uncompressedSize;
        if (entries > MAX_ARCHIVE_ENTRIES || totalSize > MAX_UNCOMPRESSED_BYTES) { zip.close(); return reject(new Error('The Office document is too complex or expands to an unsafe size.')); }
        if (entry.fileName.startsWith(expectedFolder)) hasExpectedFolder = true;
        zip.readEntry();
      });
      zip.on('end', () => hasExpectedFolder ? resolve() : reject(new Error('The file contents do not match its Office document type.')));
      zip.readEntry();
    });
  });
}
