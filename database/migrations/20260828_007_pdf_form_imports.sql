-- Auditable pre-form PDF imports. The file remains in controlled on-premise storage.
create table public.pdf_form_imports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  uploaded_by uuid references public.app_users(id) on delete set null,
  original_name text not null,
  storage_path text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  extracted_text text,
  mapped_data jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index pdf_form_imports_company_created_idx on public.pdf_form_imports (company_id, created_at desc);
