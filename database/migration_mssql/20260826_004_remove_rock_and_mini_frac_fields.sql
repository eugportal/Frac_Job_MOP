/* Remove retired Rock Mechanics, Mini-Frac Pumping Parameters, and Mini-Frac Analysis keys
   from the flexible main workbook JSON, including existing records. */
UPDATE dbo.job_reservoir_details
SET workbook_data = JSON_MODIFY(JSON_MODIFY(JSON_MODIFY(JSON_MODIFY(JSON_MODIFY(
  JSON_MODIFY(JSON_MODIFY(JSON_MODIFY(JSON_MODIFY(JSON_MODIFY(
  JSON_MODIFY(JSON_MODIFY(JSON_MODIFY(workbook_data,
    '$.youngsModulus', NULL), '$.minHorizontalStress', NULL), '$.poissonsRatio', NULL),
    '$.maxTreatingPressure', NULL), '$.avgTreatingPressure', NULL), '$.maxSlurryRate', NULL),
    '$.avgSlurryRate', NULL), '$.miniFracAvgHhp', NULL), '$.minifracBhisip', NULL),
    '$.fg', NULL), '$.cg', NULL), '$.closurePressure', NULL), '$.fluidEfficiency', NULL);
GO
