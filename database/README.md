# Production Database Inventory

This project is a Vite/React client with local browser persistence only. `database/migrations/20260821_001_initial_schema.sql` is the production baseline for an on-premise PostgreSQL deployment. SQL Server equivalents are in `database/migration_mssql` and `database/seed_mssql`.

## Data extracted from the application

| Source | Database destination | Notes |
| --- | --- | --- |
| `companies_wells.xlsx` / `frontend/src/data/authCompanies.ts` | `companies`, `wells` | 36 companies, 2,084 well names. The seed generator preserves source spelling; deduplicate aliases only after domain review. |
| `dropdownOptions.ts` | `lookup_options` | All controlled option lists are mutable master data in production. |
| `WellInfo` | `wells`, `frac_jobs`, `fields` | Stable well coordinates and rig name are stored on `wells`; job-specific data remains on `frac_jobs`. |
| `ReportsDocumentation` | `job_documents` plus an on-premise document volume/object store | Store file bytes outside PostgreSQL and browser localStorage. |
| `ReservoirInfo` and main workbook fields | `job_reservoir_details` | Named analytical columns are relational; workbook-only data is version-tolerant JSONB. |
| `StageRecord` | `job_stages` | One job has many ordered stages. |
| `CompletionRecord` and completion workbook fields | `job_completion_records` | One job has many completion records. |
| Job cost | `job_cost_details` | One record per job: Frac and Fracpack costs, operating/standby days, acid flag/cost, CT costs, additional cost, and a calculated total. |
| Form reference/status/timestamps | `frac_jobs` | Draft and submitted forms use the same record, so autosave is durable. |

## Explicitly not imported

Do not import `COMPANY_CREDENTIALS`. The current password formula is public in the frontend and cannot be used in production. `app_users.auth_method` determines sign-in: LDAP users have no local password hash, while normal users must have a bcrypt or Argon2id password hash created by the backend. Both require a unique, lowercase email address and a `company_memberships` row. `companies.email` is the optional business contact address. Theme preference and transient UI accordion state can remain client-side.

`WELL_OPTIONS` and `FIELDS_BY_WELL` are a separate four-well mock list with no company relationship. They conflict with the authoritative company/well workbook and are not seeded. Resolve their ownership and data authority before importing them into `fields`.

## Apply and seed

1. Apply `database/migrations/20260821_001_initial_schema.sql`, then `database/migrations/20260823_002_one_company_per_user.sql`, `database/migrations/20260826_003_replace_job_cost_section.sql`, and `database/migrations/20260826_004_remove_rock_and_mini_frac_fields.sql`.
2. Apply `database/seed/lookup_options.sql`.
3. Generate and apply company/well data:

```powershell
node scripts/generate-company-well-seed.mjs > database/seed/companies_and_wells.sql
# Run the generated SQL with psql or your on-premise migration runner.
```

4. Create `app_users` through the backend, then add membership rows with a least-privilege role.
5. Deploy an on-premise API that authenticates users, checks `company_memberships` on every request, stores document bytes on the approved document volume/object store, and writes `frac_jobs` plus child records in one transaction.

## Microsoft SQL Server apply and seed

The SQL Server scripts use the `dbo` schema, `uniqueidentifier`, `datetime2(3)`, `bit`, and `nvarchar(max)` JSON columns. They require SQL Server 2016 SP1 or later because the schema validates JSON with `ISJSON`.

1. Run `database/migration_mssql/20260821_001_initial_schema.sql`.
2. Run `database/migration_mssql/20260823_002_one_company_per_user.sql`, `database/migration_mssql/20260826_003_replace_job_cost_section.sql`, and `database/migration_mssql/20260826_004_remove_rock_and_mini_frac_fields.sql`.
3. Run `database/seed_mssql/lookup_options.sql`.
4. Run `database/seed_mssql/companies_and_wells.sql`. Regenerate it after changes to `frontend/src/data/authCompanies.ts`:

```powershell
node scripts/generate-company-well-seed-mssql.mjs > database/seed_mssql/companies_and_wells.sql
```

The present backend uses the PostgreSQL `pg` driver and PostgreSQL-specific query syntax, so it must be adapted to a SQL Server driver (for example `mssql`) before it can use these scripts at runtime. The scripts intentionally do not create application users or passwords.

## Production notes

- The database is private to the on-premise API. Do not expose its credentials or a direct database connection to the browser.
- Enforce company scope in the API using `company_memberships`; the API should ignore client-provided company IDs unless they are authorized.
- Store document paths as `<company-id>/<job-id>/<file-name>` on the approved document volume/object store, validating paths to prevent traversal.
- `workbook_data` and `values` retain every dynamic spreadsheet column. Promote a JSONB key to a typed column only when it becomes a filter, dashboard metric, or integrity constraint.
- The source contains inconsistent well spellings and repeated/re-frac names. Keep the raw dataset on first import; add a reviewed `well_aliases` table before consolidation so historical submissions remain traceable.
