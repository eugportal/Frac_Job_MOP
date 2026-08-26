create table public.frac_vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(name)) > 0)
);

create table public.techniques (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(name)) > 0)
);

create table public.frac_vendor_techniques (
  frac_vendor_id uuid not null references public.frac_vendors(id) on delete cascade,
  technique_id uuid not null references public.techniques(id) on delete cascade,
  primary key (frac_vendor_id, technique_id)
);
