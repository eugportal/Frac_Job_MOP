-- Self-hosted PostgreSQL schema for Frac Data Management.
-- Apply with psql or your on-premise database migration tool.
-- Authentication, authorization, and document-file access are enforced by the
-- on-premise application/API. Do not expose this database directly to browsers.

create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'editor', 'viewer');
create type public.auth_method as enum ('ldap', 'normal');
create type public.job_status as enum ('draft', 'in_progress', 'submitted', 'archived');
create type public.cost_category as enum (
  'frac_material', 'gel_chemicals', 'cross_linked_gel', 'sand_plug',
  'frac_equipment', 'frac_dht', 'clean_out', 'additional'
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  email text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is null or (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'))
);

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  -- username is the immutable login name for either LDAP or normal auth.
  username text not null unique,
  email text not null unique,
  auth_method public.auth_method not null default 'ldap',
  -- Normal-auth users need an Argon2id/bcrypt hash. LDAP users must not have one.
  password_hash text,
  display_name text,
  is_active boolean not null default true,
  is_superuser boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(username)) > 0),
  check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  check ((auth_method = 'ldap' and password_hash is null) or (auth_method = 'normal' and password_hash is not null))
);

create table public.user_profiles (
  id uuid primary key references public.app_users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_memberships (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  role public.app_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id),
  unique (user_id)
);

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  region_area text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table public.wells (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  name text not null,
  uwi text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  on_offshore text check (on_offshore in ('Onshore', 'Offshore')),
  rig_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table public.frac_vendors (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.techniques (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.frac_vendor_techniques (
  frac_vendor_id uuid not null references public.frac_vendors(id) on delete cascade,
  technique_id uuid not null references public.techniques(id) on delete cascade,
  primary key (frac_vendor_id, technique_id)
);

create table public.frac_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  well_id uuid references public.wells(id) on delete set null,
  field_id uuid references public.fields(id) on delete set null,
  reference text unique,
  status public.job_status not null default 'draft',
  job_date date,
  submitted_at timestamptz,
  submitted_by uuid references public.app_users(id) on delete set null,
  created_by uuid references public.app_users(id) on delete set null,
  data_source_confidence text,
  frac_vendor text,
  technique text,
  job_cost_enabled boolean not null default false,
  job_cost_skipped boolean not null default false,
  completion_enabled boolean not null default false,
  completion_skipped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not (job_cost_enabled and job_cost_skipped)),
  check (not (completion_enabled and completion_skipped))
);

create table public.job_reservoir_details (
  job_id uuid primary key references public.frac_jobs(id) on delete cascade,
  formation_name text,
  lithology text,
  well_type text,
  pad_percent numeric(5,2) check (pad_percent between 0 and 100),
  mid_perf_tvd numeric(12,3) check (mid_perf_tvd >= 0),
  number_of_perforations integer check (number_of_perforations >= 0),
  max_deviation numeric(5,2) check (max_deviation between 0 and 90),
  average_reservoir_pressure numeric(12,3) check (average_reservoir_pressure >= 0),
  bhst numeric(12,3) check (bhst >= 0),
  average_porosity numeric(5,2) check (average_porosity between 0 and 100),
  workbook_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.job_stages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.frac_jobs(id) on delete cascade,
  stage_number integer not null check (stage_number >= 1),
  perf_top numeric(12,3) check (perf_top >= 0),
  perf_bottom numeric(12,3) check (perf_bottom >= perf_top),
  pad_percent numeric(5,2) check (pad_percent between 0 and 100),
  fluid_volume numeric(14,3) check (fluid_volume >= 0),
  proppant_amount numeric(14,3) check (proppant_amount >= 0),
  rate numeric(12,3) check (rate >= 0),
  pressure numeric(12,3) check (pressure >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, stage_number)
);

create table public.job_documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.frac_jobs(id) on delete cascade,
  document_type text not null check (document_type in ('job_design_report', 'post_frac_report')),
  storage_path text,
  original_name text,
  mime_type text,
  byte_size bigint check (byte_size >= 0),
  uploaded_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (job_id, document_type)
);

create table public.job_completion_records (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.frac_jobs(id) on delete cascade,
  well_name_uwi text not null,
  well_type text not null,
  casing_size numeric(8,3) check (casing_size >= 0),
  tubing_dp_size numeric(8,3) check (tubing_dp_size >= 0),
  tubing_dp_grade text,
  perf_interval_top numeric(12,3) check (perf_interval_top >= 0),
  perf_interval_bottom numeric(12,3) check (perf_interval_bottom >= perf_interval_top),
  entrance_hole_size numeric(8,3) check (entrance_hole_size >= 0),
  completion_type text,
  prior_workovers integer check (prior_workovers >= 0),
  triple_compo_log text,
  cpi_log text,
  workbook_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_cost_lines (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.frac_jobs(id) on delete cascade,
  category public.cost_category not null,
  sort_order integer not null default 0,
  invoice_no text,
  description text,
  item_type text,
  invoice_amount numeric(14,2) check (invoice_amount >= 0),
  quantity numeric(14,3) check (quantity >= 0),
  unit text,
  unit_price numeric(14,4) check (unit_price >= 0),
  pumping_charge numeric(14,2) check (pumping_charge >= 0),
  related_cost numeric(14,2) check (related_cost >= 0),
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_cost_workbook_rows (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.frac_jobs(id) on delete cascade,
  sort_order integer not null default 0,
  values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lookup_options (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  value text not null,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  unique (category, value)
);

create index wells_company_name_idx on public.wells (company_id, name);
create index frac_jobs_company_status_idx on public.frac_jobs (company_id, status);
create index frac_jobs_well_date_idx on public.frac_jobs (well_id, job_date desc);
create index job_stages_job_stage_idx on public.job_stages (job_id, stage_number);
create index job_completion_records_job_idx on public.job_completion_records (job_id);
create index job_cost_lines_job_category_idx on public.job_cost_lines (job_id, category, sort_order);
create index job_cost_workbook_rows_job_idx on public.job_cost_workbook_rows (job_id, sort_order);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger companies_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger app_users_updated_at before update on public.app_users for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.user_profiles for each row execute function public.set_updated_at();
create trigger fields_updated_at before update on public.fields for each row execute function public.set_updated_at();
create trigger wells_updated_at before update on public.wells for each row execute function public.set_updated_at();
create trigger jobs_updated_at before update on public.frac_jobs for each row execute function public.set_updated_at();
create trigger reservoir_updated_at before update on public.job_reservoir_details for each row execute function public.set_updated_at();
create trigger stages_updated_at before update on public.job_stages for each row execute function public.set_updated_at();
create trigger completion_updated_at before update on public.job_completion_records for each row execute function public.set_updated_at();
create trigger cost_lines_updated_at before update on public.job_cost_lines for each row execute function public.set_updated_at();
create trigger cost_rows_updated_at before update on public.job_cost_workbook_rows for each row execute function public.set_updated_at();

-- Create a non-superuser login for the on-premise API, then grant it only the
-- permissions it needs. The API must authorize every request against
-- company_memberships before querying or mutating company-owned records.
-- Example (run separately with your chosen password management process):
--   create role frac_app login password 'replace-me';
--   grant usage on schema public to frac_app;
--   grant select, insert, update, delete on all tables in schema public to frac_app;
--   alter default privileges in schema public grant select, insert, update, delete on tables to frac_app;

-- Store document bytes on an on-premise shared volume or S3-compatible object
-- store. job_documents.storage_path should contain a relative path in the form
-- <company-id>/<job-id>/<file-name>; never accept an absolute path from clients.
