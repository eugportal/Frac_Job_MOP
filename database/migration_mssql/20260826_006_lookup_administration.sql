create table dbo.frac_vendors (
  id uniqueidentifier not null primary key default newid(),
  name nvarchar(255) not null unique,
  created_at datetimeoffset not null default sysdatetimeoffset(),
  updated_at datetimeoffset not null default sysdatetimeoffset()
);
create table dbo.techniques (
  id uniqueidentifier not null primary key default newid(),
  name nvarchar(255) not null unique,
  created_at datetimeoffset not null default sysdatetimeoffset(),
  updated_at datetimeoffset not null default sysdatetimeoffset()
);
create table dbo.frac_vendor_techniques (
  frac_vendor_id uniqueidentifier not null references dbo.frac_vendors(id) on delete cascade,
  technique_id uniqueidentifier not null references dbo.techniques(id) on delete cascade,
  primary key (frac_vendor_id, technique_id)
);
