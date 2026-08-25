import 'dotenv/config';
import { z } from 'zod';

const booleanFromEnv = z.enum(['true', 'false']).default('false').transform((value) => value === 'true');

const environment = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CORS_ORIGIN: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1).default('frac-api'),
  JWT_AUDIENCE: z.string().min(1).default('frac-web'),
  LDAP_URL: z.string().url().optional(),
  LDAP_BIND_DN: z.string().min(1).optional(),
  LDAP_BIND_PASSWORD: z.string().min(1).optional(),
  LDAP_BASE_DN: z.string().min(1).optional(),
  LDAP_USERNAME_ATTRIBUTE: z.string().regex(/^[A-Za-z][A-Za-z0-9-]*$/).default('uid'),
  LDAP_EMAIL_ATTRIBUTE: z.string().regex(/^[A-Za-z][A-Za-z0-9-]*$/).default('mail'),
  DATABASE_URL: z.string().url(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: booleanFromEnv,
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.string().min(1),
});

export const config = environment.parse(process.env);
