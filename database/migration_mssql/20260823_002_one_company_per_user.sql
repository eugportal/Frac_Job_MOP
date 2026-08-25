-- Compatibility migration for databases created before the one-company rule.
-- The initial SQL Server baseline already includes this constraint.
IF NOT EXISTS (
  SELECT 1
  FROM sys.key_constraints
  WHERE parent_object_id = OBJECT_ID(N'dbo.company_memberships')
    AND [type] = 'UQ'
    AND [name] = N'UQ_company_memberships_user_id'
)
BEGIN
  ALTER TABLE dbo.company_memberships
    ADD CONSTRAINT UQ_company_memberships_user_id UNIQUE (user_id);
END;
GO
