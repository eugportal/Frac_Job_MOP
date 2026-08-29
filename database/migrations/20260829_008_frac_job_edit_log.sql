-- Records privileged changes to already-submitted forms without changing the
-- original submitter or submission timestamp.
create table public.frac_job_edit_log (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.frac_jobs(id) on delete cascade,
  edited_by uuid references public.app_users(id) on delete set null,
  edit_type text not null default 'admin_edit',
  edited_at timestamptz not null default now(),
  check (edit_type in ('admin_edit'))
);

create index frac_job_edit_log_job_edited_idx on public.frac_job_edit_log (job_id, edited_at desc);
