if col_length('dbo.frac_jobs', 'field_id') is null
begin
  alter table dbo.frac_jobs add field_id uniqueidentifier null;
  alter table dbo.frac_jobs add constraint FK_frac_jobs_field foreign key (field_id) references dbo.fields(id) on delete set null;
  create index IX_frac_jobs_field_id on dbo.frac_jobs(field_id);
end;
