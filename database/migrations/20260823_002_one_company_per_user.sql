-- A signed-in user is routed directly to one company workspace after OTP.
-- Existing installations must resolve any multi-company memberships before this migration is applied.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.company_memberships'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (user_id)'
  ) then
    return;
  end if;
  alter table public.company_memberships
    add constraint company_memberships_one_company_per_user unique (user_id);
end;
$$;
