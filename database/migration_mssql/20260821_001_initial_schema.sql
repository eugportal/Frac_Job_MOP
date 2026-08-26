/*
  Self-hosted Microsoft SQL Server schema for Frac Data Management.
  Tested syntax target: SQL Server 2016 SP1+ (JSON support is required).
  Run this script against the target application database.
*/
SET XACT_ABORT ON;
GO

CREATE TABLE dbo.companies (
  id uniqueidentifier NOT NULL CONSTRAINT PK_companies PRIMARY KEY DEFAULT NEWID(),
  name nvarchar(255) NOT NULL CONSTRAINT UQ_companies_name UNIQUE,
  email nvarchar(320) NULL CONSTRAINT UQ_companies_email UNIQUE,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_companies_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_companies_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_companies_email CHECK (email IS NULL OR (email = LOWER(email) AND email LIKE '%_@_%._%'))
);
GO

CREATE TABLE dbo.app_users (
  id uniqueidentifier NOT NULL CONSTRAINT PK_app_users PRIMARY KEY DEFAULT NEWID(),
  username nvarchar(255) NOT NULL CONSTRAINT UQ_app_users_username UNIQUE,
  email nvarchar(320) NOT NULL CONSTRAINT UQ_app_users_email UNIQUE,
  auth_method varchar(10) NOT NULL CONSTRAINT DF_app_users_auth_method DEFAULT 'ldap',
  password_hash nvarchar(512) NULL,
  display_name nvarchar(255) NULL,
  is_active bit NOT NULL CONSTRAINT DF_app_users_is_active DEFAULT 1,
  is_superuser bit NOT NULL CONSTRAINT DF_app_users_is_superuser DEFAULT 0,
  last_login_at datetime2(3) NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_app_users_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_app_users_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_app_users_username CHECK (LEN(LTRIM(RTRIM(username))) > 0),
  CONSTRAINT CK_app_users_email CHECK (email = LOWER(email) AND email LIKE '%_@_%.__%'),
  CONSTRAINT CK_app_users_auth_method CHECK (auth_method IN ('ldap', 'normal')),
  CONSTRAINT CK_app_users_password_hash CHECK ((auth_method = 'ldap' AND password_hash IS NULL) OR (auth_method = 'normal' AND password_hash IS NOT NULL))
);
GO

CREATE TABLE dbo.user_profiles (
  id uniqueidentifier NOT NULL CONSTRAINT PK_user_profiles PRIMARY KEY,
  display_name nvarchar(255) NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_user_profiles_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_user_profiles_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_user_profiles_app_users FOREIGN KEY (id) REFERENCES dbo.app_users(id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.company_memberships (
  company_id uniqueidentifier NOT NULL,
  user_id uniqueidentifier NOT NULL,
  role varchar(10) NOT NULL CONSTRAINT DF_company_memberships_role DEFAULT 'editor',
  created_at datetime2(3) NOT NULL CONSTRAINT DF_company_memberships_created_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_company_memberships PRIMARY KEY (company_id, user_id),
  CONSTRAINT UQ_company_memberships_user_id UNIQUE (user_id),
  CONSTRAINT CK_company_memberships_role CHECK (role IN ('admin', 'editor', 'viewer')),
  CONSTRAINT FK_company_memberships_company FOREIGN KEY (company_id) REFERENCES dbo.companies(id) ON DELETE CASCADE,
  CONSTRAINT FK_company_memberships_user FOREIGN KEY (user_id) REFERENCES dbo.app_users(id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.fields (
  id uniqueidentifier NOT NULL CONSTRAINT PK_fields PRIMARY KEY DEFAULT NEWID(),
  company_id uniqueidentifier NOT NULL,
  name nvarchar(255) NOT NULL,
  region_area nvarchar(255) NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_fields_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_fields_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_fields_company_name UNIQUE (company_id, name),
  CONSTRAINT FK_fields_company FOREIGN KEY (company_id) REFERENCES dbo.companies(id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.wells (
  id uniqueidentifier NOT NULL CONSTRAINT PK_wells PRIMARY KEY DEFAULT NEWID(),
  company_id uniqueidentifier NOT NULL,
  field_id uniqueidentifier NULL,
  name nvarchar(255) NOT NULL,
  uwi nvarchar(255) NULL,
  latitude decimal(9,6) NULL,
  longitude decimal(9,6) NULL,
  on_offshore varchar(8) NULL,
  rig_name nvarchar(255) NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_wells_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_wells_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_wells_company_name UNIQUE (company_id, name),
  CONSTRAINT CK_wells_on_offshore CHECK (on_offshore IS NULL OR on_offshore IN ('Onshore', 'Offshore')),
  CONSTRAINT FK_wells_company FOREIGN KEY (company_id) REFERENCES dbo.companies(id) ON DELETE CASCADE,
  CONSTRAINT FK_wells_field FOREIGN KEY (field_id) REFERENCES dbo.fields(id) ON DELETE SET NULL
);
GO

CREATE TABLE dbo.frac_vendors (
  id uniqueidentifier NOT NULL CONSTRAINT PK_frac_vendors PRIMARY KEY DEFAULT NEWID(),
  name nvarchar(255) NOT NULL CONSTRAINT UQ_frac_vendors_name UNIQUE,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_frac_vendors_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_frac_vendors_updated_at DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE dbo.techniques (
  id uniqueidentifier NOT NULL CONSTRAINT PK_techniques PRIMARY KEY DEFAULT NEWID(),
  name nvarchar(255) NOT NULL CONSTRAINT UQ_techniques_name UNIQUE,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_techniques_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_techniques_updated_at DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE dbo.frac_vendor_techniques (
  frac_vendor_id uniqueidentifier NOT NULL,
  technique_id uniqueidentifier NOT NULL,
  CONSTRAINT PK_frac_vendor_techniques PRIMARY KEY (frac_vendor_id, technique_id),
  CONSTRAINT FK_vendor_techniques_vendor FOREIGN KEY (frac_vendor_id) REFERENCES dbo.frac_vendors(id) ON DELETE CASCADE,
  CONSTRAINT FK_vendor_techniques_technique FOREIGN KEY (technique_id) REFERENCES dbo.techniques(id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.frac_jobs (
  id uniqueidentifier NOT NULL CONSTRAINT PK_frac_jobs PRIMARY KEY DEFAULT NEWID(),
  company_id uniqueidentifier NOT NULL,
  well_id uniqueidentifier NULL,
  field_id uniqueidentifier NULL,
  reference nvarchar(100) NULL CONSTRAINT UQ_frac_jobs_reference UNIQUE,
  status varchar(12) NOT NULL CONSTRAINT DF_frac_jobs_status DEFAULT 'draft',
  job_date date NULL,
  submitted_at datetime2(3) NULL,
  submitted_by uniqueidentifier NULL,
  created_by uniqueidentifier NULL,
  data_source_confidence nvarchar(255) NULL,
  frac_vendor nvarchar(255) NULL,
  technique nvarchar(255) NULL,
  job_cost_enabled bit NOT NULL CONSTRAINT DF_frac_jobs_job_cost_enabled DEFAULT 0,
  job_cost_skipped bit NOT NULL CONSTRAINT DF_frac_jobs_job_cost_skipped DEFAULT 0,
  completion_enabled bit NOT NULL CONSTRAINT DF_frac_jobs_completion_enabled DEFAULT 0,
  completion_skipped bit NOT NULL CONSTRAINT DF_frac_jobs_completion_skipped DEFAULT 0,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_frac_jobs_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_frac_jobs_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_frac_jobs_status CHECK (status IN ('draft', 'in_progress', 'submitted', 'archived')),
  CONSTRAINT CK_frac_jobs_cost_flags CHECK (NOT (job_cost_enabled = 1 AND job_cost_skipped = 1)),
  CONSTRAINT CK_frac_jobs_completion_flags CHECK (NOT (completion_enabled = 1 AND completion_skipped = 1)),
  CONSTRAINT FK_frac_jobs_company FOREIGN KEY (company_id) REFERENCES dbo.companies(id),
  CONSTRAINT FK_frac_jobs_well FOREIGN KEY (well_id) REFERENCES dbo.wells(id) ON DELETE SET NULL,
  CONSTRAINT FK_frac_jobs_field FOREIGN KEY (field_id) REFERENCES dbo.fields(id) ON DELETE SET NULL,
  CONSTRAINT FK_frac_jobs_submitted_by FOREIGN KEY (submitted_by) REFERENCES dbo.app_users(id) ON DELETE SET NULL,
  CONSTRAINT FK_frac_jobs_created_by FOREIGN KEY (created_by) REFERENCES dbo.app_users(id) ON DELETE SET NULL
);
GO

CREATE TABLE dbo.job_reservoir_details (
  job_id uniqueidentifier NOT NULL CONSTRAINT PK_job_reservoir_details PRIMARY KEY,
  formation_name nvarchar(255) NULL, lithology nvarchar(255) NULL, well_type nvarchar(255) NULL,
  pad_percent decimal(5,2) NULL, mid_perf_tvd decimal(12,3) NULL, number_of_perforations int NULL,
  max_deviation decimal(5,2) NULL, average_reservoir_pressure decimal(12,3) NULL, bhst decimal(12,3) NULL,
  average_porosity decimal(5,2) NULL, workbook_data nvarchar(max) NOT NULL CONSTRAINT DF_reservoir_workbook_data DEFAULT N'{}',
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_reservoir_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_reservoir_pad_percent CHECK (pad_percent IS NULL OR pad_percent BETWEEN 0 AND 100),
  CONSTRAINT CK_reservoir_mid_perf_tvd CHECK (mid_perf_tvd IS NULL OR mid_perf_tvd >= 0),
  CONSTRAINT CK_reservoir_perfs CHECK (number_of_perforations IS NULL OR number_of_perforations >= 0),
  CONSTRAINT CK_reservoir_deviation CHECK (max_deviation IS NULL OR max_deviation BETWEEN 0 AND 90),
  CONSTRAINT CK_reservoir_pressure CHECK (average_reservoir_pressure IS NULL OR average_reservoir_pressure >= 0),
  CONSTRAINT CK_reservoir_bhst CHECK (bhst IS NULL OR bhst >= 0),
  CONSTRAINT CK_reservoir_porosity CHECK (average_porosity IS NULL OR average_porosity BETWEEN 0 AND 100),
  CONSTRAINT CK_reservoir_json CHECK (ISJSON(workbook_data) = 1),
  CONSTRAINT FK_reservoir_job FOREIGN KEY (job_id) REFERENCES dbo.frac_jobs(id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.job_stages (
  id uniqueidentifier NOT NULL CONSTRAINT PK_job_stages PRIMARY KEY DEFAULT NEWID(),
  job_id uniqueidentifier NOT NULL, stage_number int NOT NULL, perf_top decimal(12,3) NULL, perf_bottom decimal(12,3) NULL,
  pad_percent decimal(5,2) NULL, fluid_volume decimal(14,3) NULL, proppant_amount decimal(14,3) NULL,
  rate decimal(12,3) NULL, pressure decimal(12,3) NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_job_stages_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_job_stages_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_job_stages_job_stage UNIQUE (job_id, stage_number),
  CONSTRAINT CK_stages_number CHECK (stage_number >= 1), CONSTRAINT CK_stages_perf_top CHECK (perf_top IS NULL OR perf_top >= 0),
  CONSTRAINT CK_stages_perf_bottom CHECK (perf_bottom IS NULL OR perf_bottom >= perf_top), CONSTRAINT CK_stages_pad CHECK (pad_percent IS NULL OR pad_percent BETWEEN 0 AND 100),
  CONSTRAINT CK_stages_fluid CHECK (fluid_volume IS NULL OR fluid_volume >= 0), CONSTRAINT CK_stages_proppant CHECK (proppant_amount IS NULL OR proppant_amount >= 0),
  CONSTRAINT CK_stages_rate CHECK (rate IS NULL OR rate >= 0), CONSTRAINT CK_stages_pressure CHECK (pressure IS NULL OR pressure >= 0),
  CONSTRAINT FK_stages_job FOREIGN KEY (job_id) REFERENCES dbo.frac_jobs(id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.job_documents (
  id uniqueidentifier NOT NULL CONSTRAINT PK_job_documents PRIMARY KEY DEFAULT NEWID(),
  job_id uniqueidentifier NOT NULL, document_type varchar(20) NOT NULL, storage_path nvarchar(1024) NULL,
  original_name nvarchar(512) NULL, mime_type nvarchar(255) NULL, byte_size bigint NULL, uploaded_by uniqueidentifier NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_job_documents_created_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_job_documents_job_type UNIQUE (job_id, document_type),
  CONSTRAINT CK_documents_type CHECK (document_type IN ('job_design_report', 'post_frac_report')),
  CONSTRAINT CK_documents_byte_size CHECK (byte_size IS NULL OR byte_size >= 0),
  CONSTRAINT FK_documents_job FOREIGN KEY (job_id) REFERENCES dbo.frac_jobs(id) ON DELETE CASCADE,
  CONSTRAINT FK_documents_user FOREIGN KEY (uploaded_by) REFERENCES dbo.app_users(id) ON DELETE SET NULL
);
GO

CREATE TABLE dbo.job_completion_records (
  id uniqueidentifier NOT NULL CONSTRAINT PK_job_completion_records PRIMARY KEY DEFAULT NEWID(),
  job_id uniqueidentifier NOT NULL, well_name_uwi nvarchar(255) NOT NULL, well_type nvarchar(255) NOT NULL,
  casing_size decimal(8,3) NULL, tubing_dp_size decimal(8,3) NULL, tubing_dp_grade nvarchar(255) NULL,
  perf_interval_top decimal(12,3) NULL, perf_interval_bottom decimal(12,3) NULL, entrance_hole_size decimal(8,3) NULL,
  completion_type nvarchar(255) NULL, prior_workovers int NULL, triple_compo_log nvarchar(255) NULL, cpi_log nvarchar(255) NULL,
  workbook_data nvarchar(max) NOT NULL CONSTRAINT DF_completion_workbook_data DEFAULT N'{}',
  created_at datetime2(3) NOT NULL CONSTRAINT DF_completion_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_completion_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_completion_casing CHECK (casing_size IS NULL OR casing_size >= 0), CONSTRAINT CK_completion_tubing CHECK (tubing_dp_size IS NULL OR tubing_dp_size >= 0),
  CONSTRAINT CK_completion_perf_top CHECK (perf_interval_top IS NULL OR perf_interval_top >= 0), CONSTRAINT CK_completion_perf_bottom CHECK (perf_interval_bottom IS NULL OR perf_interval_bottom >= perf_interval_top),
  CONSTRAINT CK_completion_hole CHECK (entrance_hole_size IS NULL OR entrance_hole_size >= 0), CONSTRAINT CK_completion_workovers CHECK (prior_workovers IS NULL OR prior_workovers >= 0),
  CONSTRAINT CK_completion_json CHECK (ISJSON(workbook_data) = 1),
  CONSTRAINT FK_completion_job FOREIGN KEY (job_id) REFERENCES dbo.frac_jobs(id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.job_cost_lines (
  id uniqueidentifier NOT NULL CONSTRAINT PK_job_cost_lines PRIMARY KEY DEFAULT NEWID(),
  job_id uniqueidentifier NOT NULL, category varchar(20) NOT NULL, sort_order int NOT NULL CONSTRAINT DF_job_cost_lines_sort_order DEFAULT 0,
  invoice_no nvarchar(255) NULL, description nvarchar(max) NULL, item_type nvarchar(255) NULL, invoice_amount decimal(14,2) NULL,
  quantity decimal(14,3) NULL, unit nvarchar(50) NULL, unit_price decimal(14,4) NULL, pumping_charge decimal(14,2) NULL,
  related_cost decimal(14,2) NULL, remarks nvarchar(max) NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT DF_job_cost_lines_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_job_cost_lines_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_cost_lines_category CHECK (category IN ('frac_material', 'gel_chemicals', 'cross_linked_gel', 'sand_plug', 'frac_equipment', 'frac_dht', 'clean_out', 'additional')),
  CONSTRAINT CK_cost_lines_invoice_amount CHECK (invoice_amount IS NULL OR invoice_amount >= 0), CONSTRAINT CK_cost_lines_quantity CHECK (quantity IS NULL OR quantity >= 0),
  CONSTRAINT CK_cost_lines_unit_price CHECK (unit_price IS NULL OR unit_price >= 0), CONSTRAINT CK_cost_lines_pumping CHECK (pumping_charge IS NULL OR pumping_charge >= 0),
  CONSTRAINT CK_cost_lines_related CHECK (related_cost IS NULL OR related_cost >= 0),
  CONSTRAINT FK_cost_lines_job FOREIGN KEY (job_id) REFERENCES dbo.frac_jobs(id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.job_cost_workbook_rows (
  id uniqueidentifier NOT NULL CONSTRAINT PK_job_cost_workbook_rows PRIMARY KEY DEFAULT NEWID(),
  job_id uniqueidentifier NOT NULL, sort_order int NOT NULL CONSTRAINT DF_cost_rows_sort_order DEFAULT 0,
  [values] nvarchar(max) NOT NULL CONSTRAINT DF_cost_rows_values DEFAULT N'{}',
  created_at datetime2(3) NOT NULL CONSTRAINT DF_cost_rows_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT DF_cost_rows_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_cost_rows_json CHECK (ISJSON([values]) = 1),
  CONSTRAINT FK_cost_rows_job FOREIGN KEY (job_id) REFERENCES dbo.frac_jobs(id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.lookup_options (
  id uniqueidentifier NOT NULL CONSTRAINT PK_lookup_options PRIMARY KEY DEFAULT NEWID(),
  category nvarchar(100) NOT NULL, value nvarchar(255) NOT NULL, label nvarchar(255) NOT NULL,
  sort_order int NOT NULL CONSTRAINT DF_lookup_options_sort_order DEFAULT 0,
  is_active bit NOT NULL CONSTRAINT DF_lookup_options_is_active DEFAULT 1,
  CONSTRAINT UQ_lookup_options_category_value UNIQUE (category, value)
);
GO

CREATE INDEX IX_wells_company_name ON dbo.wells (company_id, name);
CREATE INDEX IX_frac_jobs_company_status ON dbo.frac_jobs (company_id, status);
CREATE INDEX IX_frac_jobs_well_date ON dbo.frac_jobs (well_id, job_date DESC);
CREATE INDEX IX_job_stages_job_stage ON dbo.job_stages (job_id, stage_number);
CREATE INDEX IX_completion_records_job ON dbo.job_completion_records (job_id);
CREATE INDEX IX_cost_lines_job_category ON dbo.job_cost_lines (job_id, category, sort_order);
CREATE INDEX IX_cost_rows_job ON dbo.job_cost_workbook_rows (job_id, sort_order);
GO

/* Keep update timestamps consistent with the PostgreSQL baseline. */
CREATE TRIGGER dbo.trg_set_updated_at ON dbo.companies AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE t SET updated_at = SYSUTCDATETIME() FROM dbo.companies t INNER JOIN inserted i ON i.id = t.id; END;
GO
CREATE TRIGGER dbo.trg_app_users_updated_at ON dbo.app_users AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE t SET updated_at = SYSUTCDATETIME() FROM dbo.app_users t INNER JOIN inserted i ON i.id = t.id; END;
GO
CREATE TRIGGER dbo.trg_profiles_updated_at ON dbo.user_profiles AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE t SET updated_at = SYSUTCDATETIME() FROM dbo.user_profiles t INNER JOIN inserted i ON i.id = t.id; END;
GO
CREATE TRIGGER dbo.trg_fields_updated_at ON dbo.fields AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE t SET updated_at = SYSUTCDATETIME() FROM dbo.fields t INNER JOIN inserted i ON i.id = t.id; END;
GO
CREATE TRIGGER dbo.trg_wells_updated_at ON dbo.wells AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE t SET updated_at = SYSUTCDATETIME() FROM dbo.wells t INNER JOIN inserted i ON i.id = t.id; END;
GO
CREATE TRIGGER dbo.trg_jobs_updated_at ON dbo.frac_jobs AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE t SET updated_at = SYSUTCDATETIME() FROM dbo.frac_jobs t INNER JOIN inserted i ON i.id = t.id; END;
GO
CREATE TRIGGER dbo.trg_reservoir_updated_at ON dbo.job_reservoir_details AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE t SET updated_at = SYSUTCDATETIME() FROM dbo.job_reservoir_details t INNER JOIN inserted i ON i.job_id = t.job_id; END;
GO
CREATE TRIGGER dbo.trg_stages_updated_at ON dbo.job_stages AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE t SET updated_at = SYSUTCDATETIME() FROM dbo.job_stages t INNER JOIN inserted i ON i.id = t.id; END;
GO
CREATE TRIGGER dbo.trg_completion_updated_at ON dbo.job_completion_records AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE t SET updated_at = SYSUTCDATETIME() FROM dbo.job_completion_records t INNER JOIN inserted i ON i.id = t.id; END;
GO
CREATE TRIGGER dbo.trg_cost_lines_updated_at ON dbo.job_cost_lines AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE t SET updated_at = SYSUTCDATETIME() FROM dbo.job_cost_lines t INNER JOIN inserted i ON i.id = t.id; END;
GO
CREATE TRIGGER dbo.trg_cost_rows_updated_at ON dbo.job_cost_workbook_rows AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE t SET updated_at = SYSUTCDATETIME() FROM dbo.job_cost_workbook_rows t INNER JOIN inserted i ON i.id = t.id; END;
GO
