# Frac on-premise API

Express backend providing LDAP or normal PostgreSQL authentication, email OTP verification, and one-hour JWT access tokens.

## Setup

1. Copy `.env.example` to `.env` and enter the EWS endpoint, EWS service-account credentials, database, and long random JWT secret values supplied by your infrastructure team. LDAP values are required only when LDAP login is enabled. The EWS account must have an Exchange mailbox and permission to send to the intended internal and external recipients.
2. Install dependencies with `npm install`.
3. Run `npm run dev` for development, or `npm run build` then `npm start` for production.
4. Copy the frontend `.env.example` to `.env` and set `VITE_API_URL` to this API's network URL. Its origin must match `CORS_ORIGIN` above.

## Authentication flow

1. `POST /api/auth/login` with `{ "authMethod": "ldap" | "normal", "username", "password" }`. LDAP searches using its service account and binds as the matched user. Normal auth validates a bcrypt password hash in `public.app_users`. On success it emails a six-digit OTP and returns a 10-minute `challengeId`.
2. `POST /api/auth/verify-otp` with `{ "challengeId", "otp" }`. A valid OTP returns a JWT bearer token and the user's assigned company; the frontend opens that company's frac-job form immediately. Each sign-in account must have exactly one company membership.
3. `GET /api/auth/me` with `Authorization: Bearer <token>` validates the token.

## Create a normal user

`POST /api/admin/users` is a protected provisioning endpoint. Send a current admin's JWT in `Authorization: Bearer <token>` and a JSON body such as:

```json
{
  "username": "ahmed.salem",
  "email": "ahmed.salem@example.internal",
  "password": "a-long-unique-password",
  "companyId": "company-uuid",
  "role": "editor"
}
```

The caller must either hold an `admin` role in `company_memberships` for the submitted `companyId`, or be a global superuser. The API stores only a bcrypt hash; it never returns the password or hash. This endpoint is rate limited and should be exposed only to authorized on-premise administrators.

## Frac-job API

Authenticated editors and admins can persist the complete form using these endpoints (the company is always taken from the bearer token, never from the browser):

- `POST /api/frac-jobs/drafts` saves a mutable draft.
- `POST /api/frac-jobs/submit` saves and submits the form, returning its reference number.

Both endpoints accept the frontend `FracFormData` payload and persist reservoir data, stages, completion records, cost lines, and workbook rows in one transaction. Submitted forms are immutable.

## Bootstrap the first superuser

The bootstrap command creates exactly one normal-auth superuser. It refuses to run if one already exists. Do not add these values to `.env` or commit them; supply them from your server secret manager or temporary process environment, then run:

```powershell
$env:BOOTSTRAP_SUPERUSER_USERNAME = 'portal.admin'
$env:BOOTSTRAP_SUPERUSER_EMAIL = 'portal.admin@example.internal'
$env:BOOTSTRAP_SUPERUSER_PASSWORD = 'use-a-long-unique-password'
npm run bootstrap-superuser
Remove-Item Env:BOOTSTRAP_SUPERUSER_PASSWORD
```

The created account has `app_users.is_superuser = true` and can use `POST /api/admin/users` for every company. Add exactly one company membership before signing in, because every sign-in session is bound to one company workspace.

OTP codes are single-use, expire after 10 minutes, and allow five verification attempts. The supplied in-memory challenge store is suitable for one API instance only. Before running multiple API instances, replace it with a shared store such as Redis so every instance can verify a challenge.

Keep the API and PostgreSQL private to the on-premise network. The browser must never receive LDAP bind credentials, EWS credentials, or the database password.

For normal users, use the provisioning endpoint above, never a SQL seed or browser. Set `app_users.auth_method` to `normal`; the schema requires a password hash for that user type. LDAP users use `auth_method = ldap` and must not have a local password hash.
