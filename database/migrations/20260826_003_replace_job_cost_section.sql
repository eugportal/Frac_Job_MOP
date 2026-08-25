-- Replace the line-item Job Cost model with one job-level cost record.
-- Legacy cost tables are retained so existing historical data is not deleted.

create table public.job_cost_details (
  job_id uuid primary key references public.frac_jobs(id) on delete cascade,
  frac_cost numeric(14,2) check (frac_cost is null or frac_cost >= 0),
  fracpack_cost numeric(14,2) check (fracpack_cost is null or fracpack_cost >= 0),
  job_operating_days numeric(10,2) check (job_operating_days is null or job_operating_days >= 0),
  job_standby_days numeric(10,2) check (job_standby_days is null or job_standby_days >= 0),
  acid_considered boolean,
  acid_cost numeric(14,2) check (acid_cost is null or acid_cost >= 0),
  ct_cleaning_cost numeric(14,2) check (ct_cleaning_cost is null or ct_cleaning_cost >= 0),
  ct_lifting_cost numeric(14,2) check (ct_lifting_cost is null or ct_lifting_cost >= 0),
  additional_cost numeric(14,2) check (additional_cost is null or additional_cost >= 0),
  updated_at timestamptz not null default now()
);

create trigger job_cost_details_updated_at before update on public.job_cost_details for each row execute function public.set_updated_at();
