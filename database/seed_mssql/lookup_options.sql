-- SQL Server seed for the application lookup options. Safe to run repeatedly.
MERGE dbo.lookup_options AS target
USING (VALUES
  (N'on_offshore', N'Onshore', N'Onshore', 1), (N'on_offshore', N'Offshore', N'Offshore', 2),
  (N'region_area', N'Western Desert', N'Western Desert', 1), (N'region_area', N'Eastern Desert', N'Eastern Desert', 2), (N'region_area', N'Gulf of Suez', N'Gulf of Suez', 3), (N'region_area', N'Mediterranean / Nile Delta', N'Mediterranean / Nile Delta', 4),
  (N'frac_vendor', N'Schlumberger', N'Schlumberger', 1), (N'frac_vendor', N'Halliburton', N'Halliburton', 2), (N'frac_vendor', N'Baker Hughes', N'Baker Hughes', 3), (N'frac_vendor', N'Weatherford', N'Weatherford', 4), (N'frac_vendor', N'Calfrac', N'Calfrac', 5), (N'frac_vendor', N'Trican', N'Trican', 6), (N'frac_vendor', N'Other', N'Other', 7),
  (N'data_source', N'Live Database', N'Live Database', 1), (N'data_source', N'Vendor Report', N'Vendor Report', 2), (N'data_source', N'Scanned PDF', N'Scanned PDF', 3), (N'data_source', N'Estimated', N'Estimated', 4), (N'data_source', N'Critical for QC', N'Critical for QC', 5),
  (N'technique', N'Hi-Way', N'Hi-Way', 1), (N'technique', N'Conventional', N'Conventional', 2), (N'technique', N'clear frac', N'clear frac', 3), (N'technique', N'Hi-way/Clear frac', N'Hi-way/Clear frac', 4),
  (N'lithology', N'Sandstone', N'Sandstone', 1), (N'lithology', N'Carbonate', N'Carbonate', 2), (N'lithology', N'Shale', N'Shale', 3), (N'lithology', N'Siltstone', N'Siltstone', 4), (N'lithology', N'Dolomite', N'Dolomite', 5), (N'lithology', N'Limestone', N'Limestone', 6), (N'lithology', N'Chalk', N'Chalk', 7), (N'lithology', N'Mixed', N'Mixed', 8),
  (N'well_type', N'Vertical', N'Vertical', 1), (N'well_type', N'Deviated', N'Deviated', 2), (N'well_type', N'Horizontal', N'Horizontal', 3), (N'well_type', N'Multilateral', N'Multilateral', 4),
  (N'availability', N'Available', N'Available', 1), (N'availability', N'Not Available', N'Not Available', 2),
  (N'job_type', N'Stimulation', N'Stimulation', 1), (N'job_type', N'Acidizing', N'Acidizing', 2), (N'job_type', N'Re-Frac', N'Re-Frac', 3), (N'job_type', N'Initial Completion', N'Initial Completion', 4), (N'job_type', N'Workover', N'Workover', 5),
  (N'completion_type', N'Cemented Casing', N'Cemented Casing', 1), (N'completion_type', N'Open Hole', N'Open Hole', 2), (N'completion_type', N'Perforated Casing', N'Perforated Casing', 3), (N'completion_type', N'Gravel Pack', N'Gravel Pack', 4), (N'completion_type', N'Frack Pack', N'Frack Pack', 5), (N'completion_type', N'Tubingless', N'Tubingless', 6),
  (N'tubing_grade', N'J55', N'J55', 1), (N'tubing_grade', N'K55', N'K55', 2), (N'tubing_grade', N'L80', N'L80', 3), (N'tubing_grade', N'N80', N'N80', 4), (N'tubing_grade', N'P110', N'P110', 5), (N'tubing_grade', N'Q125', N'Q125', 6), (N'tubing_grade', N'Cr13', N'13 Cr', 7), (N'tubing_grade', N'Super Cr13', N'Super 13 Cr', 8),
  (N'proppant_type', N'20/40 White Sand', N'20/40 White Sand', 1), (N'proppant_type', N'20/40 Brown Sand', N'20/40 Brown Sand', 2), (N'proppant_type', N'30/50 White Sand', N'30/50 White Sand', 3), (N'proppant_type', N'40/70 White Sand', N'40/70 White Sand', 4), (N'proppant_type', N'20/40 Ceramic', N'20/40 Ceramic', 5), (N'proppant_type', N'16/20 Ceramic', N'16/20 Ceramic', 6), (N'proppant_type', N'Resin Coated', N'Resin Coated', 7), (N'proppant_type', N'Lightweight Proppant', N'Lightweight Proppant', 8),
  (N'gel_type', N'Linear Gel 10 lb', N'Linear Gel 10 lb', 1), (N'gel_type', N'Linear Gel 20 lb', N'Linear Gel 20 lb', 2), (N'gel_type', N'Linear Gel 30 lb', N'Linear Gel 30 lb', 3), (N'gel_type', N'Linear Gel 40 lb', N'Linear Gel 40 lb', 4),
  (N'crosslinked_gel_type', N'Borate Crosslinked', N'Borate Crosslinked', 1), (N'crosslinked_gel_type', N'Zirconate Crosslinked', N'Zirconate Crosslinked', 2), (N'crosslinked_gel_type', N'Titanate Crosslinked', N'Titanate Crosslinked', 3), (N'crosslinked_gel_type', N'Clear FRAC', N'Clear FRAC', 4),
  (N'cost_unit', N'lb', N'lb', 1), (N'cost_unit', N'gal', N'gal', 2), (N'cost_unit', N'bbl', N'bbl', 3), (N'cost_unit', N'kg', N'kg', 4), (N'cost_unit', N'ton', N'ton', 5), (N'cost_unit', N'ea', N'ea', 6), (N'cost_unit', N'day', N'day', 7), (N'cost_unit', N'job', N'job', 8)
) AS source (category, value, label, sort_order)
ON target.category = source.category AND target.value = source.value
WHEN MATCHED THEN UPDATE SET label = source.label, sort_order = source.sort_order, is_active = 1
WHEN NOT MATCHED THEN INSERT (category, value, label, sort_order, is_active) VALUES (source.category, source.value, source.label, source.sort_order, 1);
GO
