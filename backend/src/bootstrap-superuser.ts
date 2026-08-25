import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { database } from './database.js';

const input = z.object({
  BOOTSTRAP_SUPERUSER_USERNAME: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9._@-]+$/),
  BOOTSTRAP_SUPERUSER_EMAIL: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  BOOTSTRAP_SUPERUSER_PASSWORD: z.string().min(12).max(1024),
}).safeParse(process.env);

if (!input.success) {
  console.error('Set BOOTSTRAP_SUPERUSER_USERNAME, BOOTSTRAP_SUPERUSER_EMAIL, and BOOTSTRAP_SUPERUSER_PASSWORD before running this command.');
  process.exitCode = 1;
} else {
  const client = await database.connect();
  try {
    await client.query('begin');
    const existing = await client.query('select 1 from public.app_users where is_superuser limit 1');
    if (existing.rowCount) throw new Error('A superuser already exists. Use the administration API to manage users.');

    const passwordHash = await bcrypt.hash(input.data.BOOTSTRAP_SUPERUSER_PASSWORD, 12);
    await client.query(
      `insert into public.app_users (username, email, auth_method, password_hash, is_superuser)
       values ($1, $2, 'normal', $3, true)`,
      [input.data.BOOTSTRAP_SUPERUSER_USERNAME, input.data.BOOTSTRAP_SUPERUSER_EMAIL, passwordHash],
    );
    await client.query('commit');
    console.log(`Superuser ${input.data.BOOTSTRAP_SUPERUSER_USERNAME} created.`);
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    console.error(error instanceof Error ? error.message : 'Unable to create the superuser.');
    process.exitCode = 1;
  } finally {
    client.release();
    await database.end();
  }
}
