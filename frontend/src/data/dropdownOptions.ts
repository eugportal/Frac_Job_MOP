// Controlled dropdown option lists derived from the Frac Data Template.

export const ON_OFFSHORE_OPTIONS = [
  { value: 'Onshore', label: 'Onshore' },
  { value: 'Offshore', label: 'Offshore' },
];

export const REGION_AREA_OPTIONS = [
  { value: 'Western Desert', label: 'Western Desert' },
  { value: 'Eastern Desert', label: 'Eastern Desert' },
  { value: 'Gulf of Suez', label: 'Gulf of Suez' },
  { value: 'Mediterranean / Nile Delta', label: 'Mediterranean / Nile Delta' },
];

export const WELL_OPTIONS = [
  { value: 'KPC-001', label: 'KPC-001' },
  { value: 'KPC-002', label: 'KPC-002' },
  { value: 'KOC-101', label: 'KOC-101' },
  { value: 'KNPC-201', label: 'KNPC-201' },
];

/** Fields available for each well. Extend this map as new wells are added. */
export const FIELDS_BY_WELL: Record<string, Option[]> = {
  'KPC-001': [
    { value: 'KPC North', label: 'KPC North' },
    { value: 'KPC South', label: 'KPC South' },
  ],
  'KPC-002': [{ value: 'KPC West', label: 'KPC West' }],
  'KOC-101': [
    { value: 'Burgan', label: 'Burgan' },
    { value: 'Raudhatain', label: 'Raudhatain' },
  ],
  'KNPC-201': [{ value: 'Mina Al-Ahmadi', label: 'Mina Al-Ahmadi' }],
};

export const FRAC_VENDOR_OPTIONS = [
  { value: 'Schlumberger', label: 'Schlumberger' },
  { value: 'Halliburton', label: 'Halliburton' },
  { value: 'Baker Hughes', label: 'Baker Hughes' },
  { value: 'Weatherford', label: 'Weatherford' },
  { value: 'Calfrac', label: 'Calfrac' },
  { value: 'Trican', label: 'Trican' },
  { value: 'Other', label: 'Other' },
];

export const DATA_SOURCE_OPTIONS = [
  { value: 'Live Database', label: 'Live Database' },
  { value: 'Vendor Report', label: 'Vendor Report' },
  { value: 'Scanned PDF', label: 'Scanned PDF' },
  { value: 'Estimated', label: 'Estimated' },
  { value: 'Critical for QC', label: 'Critical for QC' },
];

export const TECHNIQUE_OPTIONS = [
  { value: 'Hi-Way', label: 'Hi-Way' },
  { value: 'Conventional', label: 'Conventional' },
  { value: 'clear frac', label: 'clear frac' },
  { value: 'Hi-way/Clear frac', label: 'Hi-way/Clear frac' }
];

/** Techniques shown after a frac vendor is selected. Extend these lists as vendor capabilities are configured. */
export const TECHNIQUES_BY_FRAC_VENDOR: Record<string, Option[]> = {
  Schlumberger: TECHNIQUE_OPTIONS,
  Halliburton: TECHNIQUE_OPTIONS.filter((option) => option.value !== 'Hi-Way'),
  'Baker Hughes': TECHNIQUE_OPTIONS.filter((option) => option.value !== 'clear frac'),
  Weatherford: TECHNIQUE_OPTIONS.filter((option) => option.value === 'Conventional' || option.value === 'clear frac'),
  Calfrac: TECHNIQUE_OPTIONS.filter((option) => option.value !== 'Hi-way/Clear frac'),
  Trican: TECHNIQUE_OPTIONS.filter((option) => option.value === 'Hi-Way' || option.value === 'Conventional'),
  Other: TECHNIQUE_OPTIONS,
};

export const LITHOLOGY_OPTIONS = [
  { value: 'Sandstone', label: 'Sandstone' },
  { value: 'Carbonate', label: 'Carbonate' },
  { value: 'Shale', label: 'Shale' },
  { value: 'Siltstone', label: 'Siltstone' },
  { value: 'Dolomite', label: 'Dolomite' },
  { value: 'Limestone', label: 'Limestone' },
  { value: 'Chalk', label: 'Chalk' },
  { value: 'Mixed', label: 'Mixed' },
];

export const WELL_TYPE_OPTIONS = [
  { value: 'Vertical', label: 'Vertical' },
  { value: 'Deviated', label: 'Deviated' },
  { value: 'Horizontal', label: 'Horizontal' },
  { value: 'Multilateral', label: 'Multilateral' },
];

export const JOB_TYPE_OPTIONS = [
  { value: 'Stimulation', label: 'Stimulation' },
  { value: 'Acidizing', label: 'Acidizing' },
  { value: 'Re-Frac', label: 'Re-Frac' },
  { value: 'Initial Completion', label: 'Initial Completion' },
  { value: 'Workover', label: 'Workover' },
];

export const COMPLETION_TYPE_OPTIONS = [
  { value: 'Cemented Casing', label: 'Cemented Casing' },
  { value: 'Open Hole', label: 'Open Hole' },
  { value: 'Perforated Casing', label: 'Perforated Casing' },
  { value: 'Gravel Pack', label: 'Gravel Pack' },
  { value: 'Frack Pack', label: 'Frack Pack' },
  { value: 'Tubingless', label: 'Tubingless' },
];

export const TUBING_GRADE_OPTIONS = [
  { value: 'J55', label: 'J55' },
  { value: 'K55', label: 'K55' },
  { value: 'L80', label: 'L80' },
  { value: 'N80', label: 'N80' },
  { value: 'P110', label: 'P110' },
  { value: 'Q125', label: 'Q125' },
  { value: 'Cr13', label: '13 Cr' },
  { value: 'Super Cr13', label: 'Super 13 Cr' },
];

export const AVAILABILITY_OPTIONS = [
  { value: 'Available', label: 'Available' },
  { value: 'Not Available', label: 'Not Available' },
];

export const PROPPANT_TYPE_OPTIONS = [
  { value: '20/40 White Sand', label: '20/40 White Sand' },
  { value: '20/40 Brown Sand', label: '20/40 Brown Sand' },
  { value: '30/50 White Sand', label: '30/50 White Sand' },
  { value: '40/70 White Sand', label: '40/70 White Sand' },
  { value: '20/40 Ceramic', label: '20/40 Ceramic' },
  { value: '16/20 Ceramic', label: '16/20 Ceramic' },
  { value: 'Resin Coated', label: 'Resin Coated' },
  { value: 'Lightweight Proppant', label: 'Lightweight Proppant' },
];

export const GEL_TYPE_OPTIONS = [
  { value: 'Linear Gel 10 lb', label: 'Linear Gel 10 lb' },
  { value: 'Linear Gel 20 lb', label: 'Linear Gel 20 lb' },
  { value: 'Linear Gel 30 lb', label: 'Linear Gel 30 lb' },
  { value: 'Linear Gel 40 lb', label: 'Linear Gel 40 lb' },
];

export const CROSSLINK_GEL_OPTIONS = [
  { value: 'Borate Crosslinked', label: 'Borate Crosslinked' },
  { value: 'Zirconate Crosslinked', label: 'Zirconate Crosslinked' },
  { value: 'Titanate Crosslinked', label: 'Titanate Crosslinked' },
  { value: 'Clear FRAC', label: 'Clear FRAC' },
];

export const COST_UNIT_OPTIONS = [
  { value: 'lb', label: 'lb' },
  { value: 'gal', label: 'gal' },
  { value: 'bbl', label: 'bbl' },
  { value: 'kg', label: 'kg' },
  { value: 'ton', label: 'ton' },
  { value: 'ea', label: 'ea' },
  { value: 'day', label: 'day' },
  { value: 'job', label: 'job' },
];

export type Option = { value: string; label: string };
