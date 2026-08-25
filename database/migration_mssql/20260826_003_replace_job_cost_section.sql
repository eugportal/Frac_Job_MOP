/* Replace the line-item Job Cost model with one job-level cost record.
   Legacy cost tables are retained so existing historical data is not deleted. */
CREATE TABLE dbo.job_cost_details (
  job_id uniqueidentifier NOT NULL CONSTRAINT PK_job_cost_details PRIMARY KEY,
  frac_cost decimal(14,2) NULL,
  fracpack_cost decimal(14,2) NULL,
  job_operating_days decimal(10,2) NULL,
  job_standby_days decimal(10,2) NULL,
  acid_considered bit NULL,
  acid_cost decimal(14,2) NULL,
  ct_cleaning_cost decimal(14,2) NULL,
  ct_lifting_cost decimal(14,2) NULL,
  additional_cost decimal(14,2) NULL,
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_job_cost_details_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_job_cost_details_frac CHECK (frac_cost IS NULL OR frac_cost >= 0),
  CONSTRAINT CK_job_cost_details_fracpack CHECK (fracpack_cost IS NULL OR fracpack_cost >= 0),
  CONSTRAINT CK_job_cost_details_operating_days CHECK (job_operating_days IS NULL OR job_operating_days >= 0),
  CONSTRAINT CK_job_cost_details_standby_days CHECK (job_standby_days IS NULL OR job_standby_days >= 0),
  CONSTRAINT CK_job_cost_details_acid CHECK (acid_cost IS NULL OR acid_cost >= 0),
  CONSTRAINT CK_job_cost_details_ct_cleaning CHECK (ct_cleaning_cost IS NULL OR ct_cleaning_cost >= 0),
  CONSTRAINT CK_job_cost_details_ct_lifting CHECK (ct_lifting_cost IS NULL OR ct_lifting_cost >= 0),
  CONSTRAINT CK_job_cost_details_additional CHECK (additional_cost IS NULL OR additional_cost >= 0),
  CONSTRAINT FK_job_cost_details_job FOREIGN KEY (job_id) REFERENCES dbo.frac_jobs(id) ON DELETE CASCADE
);
GO
CREATE TRIGGER dbo.trg_job_cost_details_updated_at ON dbo.job_cost_details AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE t SET updated_at = SYSUTCDATETIME() FROM dbo.job_cost_details t INNER JOIN inserted i ON i.job_id = t.job_id; END;
GO
