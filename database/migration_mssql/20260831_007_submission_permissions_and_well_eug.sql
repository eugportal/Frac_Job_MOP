-- SQL Server equivalent of the submission-permission and Well EUG migration.
IF COL_LENGTH('dbo.company_memberships', 'submission_access') IS NULL
  ALTER TABLE dbo.company_memberships ADD submission_access varchar(10) NOT NULL CONSTRAINT DF_company_memberships_submission_access DEFAULT 'view';
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_company_memberships_submission_access')
  ALTER TABLE dbo.company_memberships ADD CONSTRAINT CK_company_memberships_submission_access CHECK (submission_access IN ('view', 'manage'));
GO
IF COL_LENGTH('dbo.company_memberships', 'can_view_all_submissions') IS NULL
  ALTER TABLE dbo.company_memberships ADD can_view_all_submissions bit NOT NULL CONSTRAINT DF_company_memberships_view_all_submissions DEFAULT 0;
GO
IF COL_LENGTH('dbo.wells', 'well_eug') IS NULL
  ALTER TABLE dbo.wells ADD well_eug nvarchar(255) NULL;
GO
UPDATE dbo.wells SET well_eug = uwi WHERE well_eug IS NULL AND uwi IS NOT NULL;
GO
