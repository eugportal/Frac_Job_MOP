-- Submission permissions are assigned by a superuser for each company member.
alter table public.company_memberships
  add column if not exists submission_access text not null default 'view'
    check (submission_access in ('view', 'manage')),
  add column if not exists can_view_all_submissions boolean not null default false;

-- Well EUG is the authoritative identifier shown beside the selected well.
-- Keep `uwi` for backwards compatibility with existing integrations.
alter table public.wells add column if not exists well_eug text;
update public.wells set well_eug = uwi where well_eug is null and uwi is not null;
