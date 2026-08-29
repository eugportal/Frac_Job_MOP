-- Records privileged changes to already-submitted forms without changing the
-- original submitter or submission timestamp.
create table dbo.frac_job_edit_log (
  id uniqueidentifier not null primary key default newid(),
  job_id uniqueidentifier not null,
  edited_by uniqueidentifier null,
  edit_type varchar(32) not null constraint DF_frac_job_edit_log_type default 'admin_edit',
  edited_at datetime2(3) not null constraint DF_frac_job_edit_log_edited_at default sysutcdatetime(),
  constraint CK_frac_job_edit_log_type check (edit_type in ('admin_edit')),
  constraint FK_frac_job_edit_log_job foreign key (job_id) references dbo.frac_jobs(id) on delete cascade,
  constraint FK_frac_job_edit_log_user foreign key (edited_by) references dbo.app_users(id) on delete set null
);
go

create index IX_frac_job_edit_log_job_edited on dbo.frac_job_edit_log (job_id, edited_at desc);
go
