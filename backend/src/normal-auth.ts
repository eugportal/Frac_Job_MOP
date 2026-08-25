import bcrypt from 'bcryptjs';
import type { LdapUser } from './ldap-auth.js';
import { database } from './database.js';

export class UserManagementError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
  }
}

export async function authenticateNormally(username: string, password: string): Promise<LdapUser | null> {
  console.log('Authenticating normal user:', username);
  const result = await database.query<{ username: string; email: string; password_hash: string | null; is_active: boolean }>(
    `select username, email, password_hash, is_active
     from public.app_users
     where username = $1 and auth_method = 'normal'
     limit 1`,
    [username],
  );
  const user = result.rows[0];
  console.log('User found:', user ? user.username : 'none', 'is_active:', user?.is_active, 'has password_hash:', !!user?.password_hash);
  if (!user?.is_active || !user.password_hash) return null;

  const isValid = await bcrypt.compare(password, user.password_hash);
  return isValid ? { username: user.username, email: user.email } : null;
}

interface CreateNormalUserInput {
  createdByUsername: string;
  username: string;
  email: string;
  password: string;
  companyId: string;
  role: 'admin' | 'editor' | 'viewer';
}

export async function createNormalUser(input: CreateNormalUserInput) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const client = await database.connect();

  try {
    await client.query('begin');
    const authorization = await client.query<{ is_superuser: boolean; is_company_admin: boolean }>(
      `select user_account.is_superuser,
         exists (
           select 1 from public.company_memberships membership
           where membership.user_id = user_account.id
             and membership.company_id = $2
             and membership.role = 'admin'
         ) as is_company_admin
       from public.app_users user_account
       where user_account.username = $1 and user_account.is_active`,
      [input.createdByUsername, input.companyId],
    );
    const administrator = authorization.rows[0];
    if (!administrator || (!administrator.is_superuser && !administrator.is_company_admin)) {
      throw new UserManagementError(403, 'You are not an administrator for this company.');
    }

    const userResult = await client.query<{ id: string; username: string; email: string }>(
      `insert into public.app_users (username, email, auth_method, password_hash)
       values ($1, $2, 'normal', $3)
       returning id, username, email`,
      [input.username, input.email, passwordHash],
    );
    const user = userResult.rows[0];

    await client.query(
      `insert into public.company_memberships (company_id, user_id, role)
       values ($1, $2, $3)`,
      [input.companyId, user.id, input.role],
    );
    await client.query('commit');
    return user;
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    if (error instanceof UserManagementError) throw error;
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      throw new UserManagementError(409, 'A user with that username or email already exists.');
    }
    throw error;
  } finally {
    client.release();
  }
}
