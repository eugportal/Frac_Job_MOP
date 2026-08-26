import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { config } from './config.js';
import { authenticateNormally, createNormalUser, UserManagementError } from './normal-auth.js';
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
  try { return response.status(200).json({ job: await saveFracJob(user, request.body, false) }); } catch (error) { next(error); }
});

app.post('/api/frac-jobs/submit', async (request, response, next) => {
  const user = authenticatedSession(request);
  if (!user) return response.status(401).json({ message: 'Invalid or expired bearer token.' });
  if (user.role === 'viewer') return response.status(403).json({ message: 'Viewers cannot submit forms.' });
  try { return response.status(201).json({ job: await saveFracJob(user, request.body, true) }); } catch (error) { next(error); }
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

app.post('/api/frac-jobs/:jobId/documents/:documentType', express.raw({ type: () => true, limit: '50mb' }), async (request, response, next) => {
  const user = authenticatedSession(request);
  if (!user) return response.status(401).json({ message: 'Invalid or expired bearer token.' });
  if (user.role === 'viewer') return response.status(403).json({ message: 'Viewers cannot upload documents.' });
  const documentType = request.params.documentType as keyof typeof documentTypes;
  const definition = documentTypes[documentType];
  if (!definition || !/^[0-9a-f-]{36}$/i.test(request.params.jobId) || !Buffer.isBuffer(request.body) || request.body.length === 0) return response.status(400).json({ message: 'A valid report file is required.' });
  try {
    const job = await database.query<{ well_name: string }>(
      'select w.name as well_name from public.frac_jobs j join public.wells w on w.id = j.well_id where j.id = $1 and j.company_id = $2',
      [request.params.jobId, user.companyId],
    );
    if (!job.rows[0]) return response.status(404).json({ message: 'Job not found for your company.' });
    const originalName = decodeURIComponent(request.header('x-file-name') ?? 'report');
    const extension = path.extname(originalName).toLowerCase();
    if (!['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(extension)) return response.status(400).json({ message: 'Only PDF, Word, and Excel report files are allowed.' });
    const safeWell = job.rows[0].well_name.replace(/[^a-z0-9_-]/gi, '_');
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const fileName = `${definition.prefix}_${safeWell}_${timestamp}${extension}`;
    const directory = path.resolve(process.cwd(), 'uploads', definition.directory);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), request.body, { flag: 'wx' });
    const storagePath = path.posix.join('uploads', definition.directory, fileName);
    await database.query(
      `insert into public.job_documents (job_id, document_type, storage_path, original_name, mime_type, byte_size, uploaded_by)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (job_id, document_type) do update set storage_path=excluded.storage_path, original_name=excluded.original_name, mime_type=excluded.mime_type, byte_size=excluded.byte_size, uploaded_by=excluded.uploaded_by, created_at=now()`,
      [request.params.jobId, documentType, storagePath, originalName, request.header('content-type') ?? 'application/octet-stream', request.body.length, user.id],
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
  if (error instanceof z.ZodError) return response.status(400).json({ message: 'Invalid request.', issues: error.flatten() });
  if (error instanceof UserManagementError) return response.status(error.statusCode).json({ message: error.message });
  if (error instanceof LookupAdminError) return response.status(error.statusCode).json({ message: error.message });
  if (error instanceof FracJobError) return response.status(error.statusCode).json({ message: error.message });
  console.error(error);
  return response.status(500).json({ message: 'Authentication service is unavailable.' });
});

app.listen(config.PORT, () => console.log(`Frac API listening on port ${config.PORT}`));
