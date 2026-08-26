alter table public.frac_jobs
  add column if not exists field_id uuid references public.fields(id) on delete set null;

create index if not exists frac_jobs_field_id_idx on public.frac_jobs(field_id);
