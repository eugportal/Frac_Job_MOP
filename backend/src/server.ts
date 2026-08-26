import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import multer, { MulterError } from 'multer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { validateReportFile } from './file-validation.js';
import { z } from 'zod';
import { config } from './config.js';
import { authenticateNormally, createNormalUser, deleteNormalUser, updateNormalUser, UserManagementError } from './normal-auth.js';
import { LookupAdminError, createLookup, deleteLookup, importLookupWorkbook, listAdminLookupData, updateLookup } from './admin-lookups.js';
import { sendOtpEmail } from './mailer.js';
import { createOtpChallenge, verifyOtpChallenge } from './otp.js';
import { findSessionUser, FracJobError, saveFracJob, type SessionUser } from './frac-jobs.js';
import { database } from './database.js';

const username = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9._@-]+$/);
const password = z.string().min(12).max(1024);
const loginRequest = z.object({
  authMethod: z.literal('normal'),
  username,
  password: z.string().min(1).max(1024),
});
const otpRequest = z.object({
  challengeId: z.string().uuid(),
  otp: z.string().regex(/^\d{6}$/),
});
const createUserRequest = z.object({
  username,
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password,
  companyId: z.string().uuid(),
  role: z.enum(['admin', 'editor', 'viewer']).default('editor'),
});
const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Authorization', 'Content-Type', 'X-Company-Id','X-File-Name'] }));
app.use(express.json({ limit: '1mb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false });

function authenticatedSession(request: Request): SessionUser | null {
  const token = request.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const claims = jwt.verify(token, config.JWT_SECRET, { issuer: config.JWT_ISSUER, audience: config.JWT_AUDIENCE });
    if (typeof claims !== 'object' || typeof claims.sub !== 'string' || typeof claims.uid !== 'string' || typeof claims.cid !== 'string' || typeof claims.company !== 'string' || !['admin', 'editor', 'viewer'].includes(String(claims.role))) return null;
    return { id: claims.uid, username: claims.sub, email: typeof claims.email === 'string' ? claims.email : '', companyId: claims.cid, companyName: claims.company, role: claims.role as SessionUser['role'], isSuperuser: claims.superuser === true };
  } catch {
    return null;
  }
}

app.get('/health', (_request, response) => response.status(200).json({ status: 'ok' }));

app.post('/api/auth/login', authLimiter, async (request, response, next) => {
  try {
    const { authMethod, username, password } = loginRequest.parse(request.body);
    const authenticatedUser = await authenticateNormally(username, password);
    if (!authenticatedUser) return response.status(401).json({ message: 'Invalid username or password.' });
    const user = await findSessionUser(authenticatedUser.username, authenticatedUser.email);
    if (!user) return response.status(403).json({ message: 'Your account is not assigned to a company.' });

    const challenge = createOtpChallenge(user);
    await sendOtpEmail(user.email, challenge.otp);
    return response.status(202).json({ challengeId: challenge.challengeId, expiresInSeconds: challenge.expiresInSeconds });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/verify-otp', authLimiter, async (request, response, next) => {
  try {
    const { challengeId, otp } = otpRequest.parse(request.body);
    const user = verifyOtpChallenge(challengeId, otp);
    if (!user) return response.status(401).json({ message: 'Invalid or expired verification code.' });

    const sessionUser = await findSessionUser(user.username, user.email);
    if (!sessionUser) return response.status(403).json({ message: 'Your account is not assigned to a company.' });
    const token = jwt.sign({ email: sessionUser.email, uid: sessionUser.id, cid: sessionUser.companyId, company: sessionUser.companyName, role: sessionUser.role, superuser: sessionUser.isSuperuser }, config.JWT_SECRET, {
      subject: sessionUser.username,
      expiresIn: '1h',
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
    });
    return response.status(200).json({ accessToken: token, tokenType: 'Bearer', expiresInSeconds: 3600, company: sessionUser.companyName, isSuperuser: sessionUser.isSuperuser });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/users', adminLimiter, async (request, response, next) => {
  const administrator = authenticatedSession(request);
  if (!administrator) return response.status(401).json({ message: 'Invalid or expired bearer token.' });

  try {
    const input = createUserRequest.parse(request.body);
    const user = await createNormalUser({ ...input, createdByUsername: administrator.username });
    return response.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

app.post('/api/frac-jobs/drafts', async (request, response, next) => {
  const user = authenticatedSession(request);
  if (!user) return response.status(401).json({ message: 'Invalid or expired bearer token.' });
  if (user.role === 'viewer') return response.status(403).json({ message: 'Viewers cannot save forms.' });
  try { return response.status(200).json({ job: await saveFracJob(user, request.body, false, true) }); } catch (error) { next(error); }
});

app.post('/api/frac-jobs/submit', async (request, response, next) => {
  const user = authenticatedSession(request);
  if (!user) return response.status(401).json({ message: 'Invalid or expired bearer token.' });
  if (user.role === 'viewer') return response.status(403).json({ message: 'Viewers cannot submit forms.' });
  try { return response.status(201).json({ job: await saveFracJob(user, request.body, true, true) }); } catch (error) { next(error); }
});

function jobScope(user: SessionUser) { return user.isSuperuser ? { clause: '', values: [] as string[] } : { clause: ' and j.company_id = $1', values: [user.companyId] }; }

app.get('/api/frac-jobs/submissions', async (request, response, next) => {
  const user = authenticatedSession(request);
  if (!user) return response.status(401).json({ message: 'Invalid or expired bearer token.' });
  const scope = jobScope(user);
  try {
    const jobs = await database.query<{ id: string; reference: string | null; status: string; job_date: string | null; submitted_at: string | null; company: string; well: string | null; submitted_by: string | null }>(
      `select j.id, j.reference, j.status, j.job_date, j.submitted_at, c.name as company, w.name as well, submitter.username as submitted_by
         from public.frac_jobs j join public.companies c on c.id=j.company_id left join public.wells w on w.id=j.well_id left join public.app_users submitter on submitter.id=j.submitted_by
        where j.status = 'submitted'${scope.clause} order by j.submitted_at desc nulls last`, scope.values,
    );
    const documents = await database.query<{ job_id: string; document_type: string; original_name: string | null }>(
      `select d.job_id, d.document_type, d.original_name from public.job_documents d join public.frac_jobs j on j.id=d.job_id where j.status='submitted'${user.isSuperuser ? '' : ' and j.company_id=$1'}`, scope.values,
    );
    const byJob = new Map<string, Array<{ type: string; name: string | null }>>();
    for (const document of documents.rows) byJob.set(document.job_id, [...(byJob.get(document.job_id) ?? []), { type: document.document_type, name: document.original_name }]);
    return response.status(200).json({ submissions: jobs.rows.map((job) => ({ ...job, documents: byJob.get(job.id) ?? [] })) });
  } catch (error) { next(error); }
});

app.get('/api/frac-jobs/:jobId/documents/:documentType/download', async (request, response, next) => {
  const user = authenticatedSession(request);
  if (!user) return response.status(401).json({ message: 'Invalid or expired bearer token.' });
  const jobId = typeof request.params.jobId === 'string' ? request.params.jobId : '';
  const documentType = typeof request.params.documentType === 'string' ? request.params.documentType : '';
  if (!/^[0-9a-f-]{36}$/i.test(jobId) || !documentTypes[documentType as keyof typeof documentTypes]) return response.status(404).json({ message: 'Document not found.' });
  try {
    const document = await database.query<{ storage_path: string | null; original_name: string | null; mime_type: string | null }>(
      `select d.storage_path, d.original_name, d.mime_type from public.job_documents d join public.frac_jobs j on j.id=d.job_id where d.job_id=$1 and d.document_type=$2${user.isSuperuser ? '' : ' and j.company_id=$3'}`,
      user.isSuperuser ? [jobId, documentType] : [jobId, documentType, user.companyId],
    );
    const row = document.rows[0];
    if (!row?.storage_path) return response.status(404).json({ message: 'Document not found.' });
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const filePath = path.resolve(process.cwd(), row.storage_path);
    if (!filePath.startsWith(`${uploadsRoot}${path.sep}`)) return response.status(404).json({ message: 'Document not found.' });
    response.type(row.mime_type ?? 'application/octet-stream');
    return response.download(filePath, row.original_name ?? 'report');
  } catch (error) { next(error); }
});

app.get('/api/companies/me/wells', async (request, response, next) => {
  const user = authenticatedSession(request);
  if (!user) return response.status(401).json({ message: 'Invalid or expired bearer token.' });
  try {
    const result = await database.query<{ id: string; name: string; uwi: string | null }>('select id, name, uwi from public.wells where company_id = $1 order by name', [user.companyId]);
    return response.status(200).json({ wells: result.rows });
  } catch (error) { next(error); }
});

app.get('/api/companies/me/fields', async (request, response, next) => {
  const user = authenticatedSession(request);
  if (!user) return response.status(401).json({ message: 'Invalid or expired bearer token.' });
  try {
    const result = await database.query<{ id: string; name: string }>('select id, name from public.fields where company_id = $1 order by name', [user.companyId]);
    return response.status(200).json({ fields: result.rows });
  } catch (error) { next(error); }
});

app.get('/api/companies/me/frac-options', async (request, response, next) => {
  const user = authenticatedSession(request);
  if (!user) return response.status(401).json({ message: 'Invalid or expired bearer token.' });
  try {
    const result = await database.query<{ vendor: string; technique: string | null }>(`select v.name as vendor, t.name as technique from public.frac_vendors v left join public.frac_vendor_techniques vt on vt.frac_vendor_id=v.id left join public.techniques t on t.id=vt.technique_id order by v.name,t.name`);
    return response.status(200).json({ options: result.rows });
  } catch (error) { next(error); }
});

function requireSuperuser(request: Request, response: Response) {
  const user = authenticatedSession(request);
  if (!user) { response.status(401).json({ message: 'Invalid or expired bearer token.' }); return null; }
  if (!user.isSuperuser) { response.status(403).json({ message: 'Superadmin access is required.' }); return null; }
  return user;
}

app.get('/api/admin/users', async (request, response, next) => {
  if (!requireSuperuser(request, response)) return;
  try {
    const result = await database.query<{ id: string; username: string; email: string; company_id: string; company: string; role: 'admin' | 'editor' | 'viewer' }>(
      `select u.id, u.username, u.email, m.company_id, c.name as company, m.role from public.app_users u join public.company_memberships m on m.user_id=u.id join public.companies c on c.id=m.company_id where not u.is_superuser order by c.name, u.username`,
    );
    return response.status(200).json({ users: result.rows });
  } catch (error) { next(error); }
});
app.put('/api/admin/users/:id', adminLimiter, async (request, response, next) => {
  if (!requireSuperuser(request, response)) return;
  try { const input = createUserRequest.parse(request.body); return response.status(200).json({ user: await updateNormalUser(String(request.params.id), input) }); } catch (error) { next(error); }
});
app.delete('/api/admin/users/:id', adminLimiter, async (request, response, next) => {
  if (!requireSuperuser(request, response)) return;
  try { await deleteNormalUser(String(request.params.id)); return response.status(204).end(); } catch (error) { next(error); }
});

app.get('/api/admin/lookup-data', async (request, response, next) => {
  if (!requireSuperuser(request, response)) return;
  const companyId = typeof request.query.companyId === 'string' ? request.query.companyId : '';
  if (!/^[0-9a-f-]{36}$/i.test(companyId)) return response.status(400).json({ message: 'A valid company is required.' });
  try { return response.status(200).json(await listAdminLookupData(companyId)); } catch (error) { next(error); }
});
app.get('/api/admin/companies', async (request, response, next) => {
  if (!requireSuperuser(request, response)) return;
  try {
    const result = await database.query<{ id: string; name: string }>('select id, name from public.companies order by name');
    return response.status(200).json({ companies: result.rows });
  } catch (error) { next(error); }
});

app.post('/api/admin/lookups/:type', adminLimiter, async (request, response, next) => {
  if (!requireSuperuser(request, response)) return;
  try { return response.status(201).json({ item: await createLookup(String(request.params.type), request.body) }); } catch (error) { next(error); }
});
app.put('/api/admin/lookups/:type/:id', adminLimiter, async (request, response, next) => {
  if (!requireSuperuser(request, response)) return;
  try { return response.status(200).json({ item: await updateLookup(String(request.params.type), String(request.params.id), request.body) }); } catch (error) { next(error); }
});
app.delete('/api/admin/lookups/:type/:id', adminLimiter, async (request, response, next) => {
  if (!requireSuperuser(request, response)) return;
  try { await deleteLookup(String(request.params.type), String(request.params.id), typeof request.query.companyId === 'string' ? request.query.companyId : undefined); return response.status(204).end(); } catch (error) { next(error); }
});
app.post('/api/admin/lookups/:type/import', adminLimiter, express.raw({ type: () => true, limit: '10mb' }), async (request, response, next) => {
  if (!requireSuperuser(request, response)) return;
  try { return response.status(201).json(await importLookupWorkbook(String(request.params.type), request.header('x-company-id'), request.body)); } catch (error) { next(error); }
});

const documentTypes = {
  job_design_report: { directory: 'Job Design Report', prefix: 'job_design' },
  post_frac_report: { directory: 'Post Frac Report', prefix: 'post_frac' },
} as const;

const reportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
});

app.post('/api/frac-jobs/:jobId/documents/:documentType', reportUpload.single('reportFile'), async (request, response, next) => {
  const user = authenticatedSession(request);
  if (!user) return response.status(401).json({ message: 'Invalid or expired bearer token.' });
  if (user.role === 'viewer') return response.status(403).json({ message: 'Viewers cannot upload documents.' });
  const jobId = typeof request.params.jobId === 'string' ? request.params.jobId : '';
  const documentType = request.params.documentType as keyof typeof documentTypes;
  const definition = documentTypes[documentType];
  const reportFile = request.file;
  if (!definition || !/^[0-9a-f-]{36}$/i.test(jobId) || !reportFile?.buffer?.length) return response.status(400).json({ message: 'A valid report file is required.' });
  try {
    const job = await database.query<{ well_name: string }>(
      'select w.name as well_name from public.frac_jobs j join public.wells w on w.id = j.well_id where j.id = $1 and j.company_id = $2',
      [jobId, user.companyId],
    );
    if (!job.rows[0]) return response.status(404).json({ message: 'Job not found for your company.' });
    const originalName = path.basename(reportFile.originalname);
    const extension = path.extname(originalName).toLowerCase();
    try { await validateReportFile(originalName, reportFile.buffer); } catch (error) { return response.status(400).json({ message: error instanceof Error ? error.message : 'The uploaded file is invalid.' }); }
    const safeWell = job.rows[0].well_name.replace(/[^a-z0-9_-]/gi, '_');
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const fileName = `${definition.prefix}_${safeWell}_${timestamp}${extension}`;
    const directory = path.resolve(process.cwd(), 'uploads', definition.directory);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), reportFile.buffer, { flag: 'wx' });
    const storagePath = path.posix.join('uploads', definition.directory, fileName);
    await database.query(
      `insert into public.job_documents (job_id, document_type, storage_path, original_name, mime_type, byte_size, uploaded_by)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (job_id, document_type) do update set storage_path=excluded.storage_path, original_name=excluded.original_name, mime_type=excluded.mime_type, byte_size=excluded.byte_size, uploaded_by=excluded.uploaded_by, created_at=now()`,
      [jobId, documentType, storagePath, originalName, reportFile.mimetype || 'application/octet-stream', reportFile.size, user.id],
    );
    return response.status(201).json({ storagePath, fileName });
  } catch (error) { next(error); }
});

app.get('/api/auth/me', (request, response) => {
  const token = request.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return response.status(401).json({ message: 'Missing bearer token.' });
  try {
    const claims = jwt.verify(token, config.JWT_SECRET, { issuer: config.JWT_ISSUER, audience: config.JWT_AUDIENCE });
    return response.status(200).json({ user: claims });
  } catch {
    return response.status(401).json({ message: 'Invalid or expired bearer token.' });
  }
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return response.status(400).json({ message: 'Report files must be 50 MB or smaller.' });
    return response.status(400).json({ message: 'Upload exactly one report file.' });
  }
  if (error instanceof z.ZodError) return response.status(400).json({ message: 'Invalid request.', issues: error.flatten() });
  if (error instanceof UserManagementError) return response.status(error.statusCode).json({ message: error.message });
  if (error instanceof LookupAdminError) return response.status(error.statusCode).json({ message: error.message });
  if (error instanceof FracJobError) return response.status(error.statusCode).json({ message: error.message });
  console.error(error);
  return response.status(500).json({ message: 'Authentication service is unavailable.' });
});

app.listen(config.PORT, () => console.log(`Frac API listening on port ${config.PORT}`));
