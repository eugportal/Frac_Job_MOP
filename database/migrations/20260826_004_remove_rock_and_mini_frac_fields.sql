-- Remove retired Rock Mechanics, Mini-Frac Pumping Parameters, and Mini-Frac Analysis keys
-- from the flexible main workbook JSON, including existing records.
update public.job_reservoir_details
set workbook_data = workbook_data
  - 'youngsModulus' - 'minHorizontalStress' - 'poissonsRatio'
  - 'maxTreatingPressure' - 'avgTreatingPressure' - 'maxSlurryRate' - 'avgSlurryRate' - 'miniFracAvgHhp'
  - 'minifracBhisip' - 'fg' - 'cg' - 'closurePressure' - 'fluidEfficiency'
where workbook_data ?| array[
  'youngsModulus', 'minHorizontalStress', 'poissonsRatio',
  'maxTreatingPressure', 'avgTreatingPressure', 'maxSlurryRate', 'avgSlurryRate', 'miniFracAvgHhp',
  'minifracBhisip', 'fg', 'cg', 'closurePressure', 'fluidEfficiency'
];
