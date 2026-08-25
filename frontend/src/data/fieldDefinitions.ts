// Configuration-driven field definitions for the Frac Data form.
// Each field describes its label, type, unit, validation rules, and help text.

import type { Option } from './dropdownOptions';

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'radio' | 'textarea';

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  unit?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  help?: string;
  options?: Option[];
  group: string;
}

export const WELL_INFO_FIELDS: FieldDefinition[] = [
  {
    name: 'well',
    label: 'Well',
    type: 'text',
    required: true,
    placeholder: 'e.g. KPC-001',
    help: 'Unique well identifier or name.',
    group: 'Well Information',
  },
  {
    name: 'wellEug',
    label: 'Well EUG',
    type: 'text',
    placeholder: 'e.g. EUG-001',
    group: 'Well Information',
  },
  {
    name: 'field',
    label: 'Field',
    type: 'text',
    required: true,
    placeholder: 'e.g. KPC',
    group: 'Well Information',
  },
  {
    name: 'regionArea',
    label: 'Region / Area',
    type: 'select',
    options: [
      { value: 'Western Desert', label: 'Western Desert' },
      { value: 'Eastern Desert', label: 'Eastern Desert' },
      { value: 'Gulf of Suez', label: 'Gulf of Suez' },
      { value: 'Mediterranean / Nile Delta', label: 'Mediterranean / Nile Delta' },
    ],
    group: 'Well Information',
  },
  { name: 'latitude', label: 'Latitude', type: 'number', step: 0.000001, group: 'Well Information' },
  { name: 'longitude', label: 'Longitude', type: 'number', step: 0.000001, group: 'Well Information' },
  {
    name: 'jobDate',
    label: 'Job Date',
    type: 'date',
    required: true,
    group: 'Well Information',
  },
  {
    name: 'onOffShore',
    label: 'On / Off Shore',
    type: 'select',
    required: true,
    options: [
      { value: 'Onshore', label: 'Onshore' },
      { value: 'Offshore', label: 'Offshore' },
    ],
    group: 'Well Information',
  },
  {
    name: 'fracVendor',
    label: 'Frac Vendor',
    type: 'select',
    options: [],
    placeholder: 'Select vendor',
    group: 'Well Information',
  },
  {
    name: 'rigName',
    label: 'Rig Name / Rigless',
    type: 'text',
    placeholder: 'e.g. Rig-7 or Rigless',
    group: 'Well Information',
  },
  {
    name: 'dataSourceConfidence',
    label: 'Data Source / Confidence',
    type: 'select',
    options: [],
    placeholder: 'Select confidence level',
    group: 'Well Information',
  },
];

export const RESERVOIR_FIELDS: FieldDefinition[] = [
  {
    name: 'formationName',
    label: 'Formation Name',
    type: 'text',
    placeholder: 'e.g. Unayzah',
    group: 'Reservoir Information',
  },
  {
    name: 'lithology',
    label: 'Lithology',
    type: 'select',
    options: [],
    placeholder: 'Select lithology',
    group: 'Reservoir Information',
  },
  {
    name: 'wellType',
    label: 'Well Type',
    type: 'select',
    required: true,
    options: [],
    group: 'Reservoir Information',
  },
  {
    name: 'padPercent',
    label: 'Pad %',
    type: 'number',
    min: 0,
    max: 100,
    step: 0.1,
    unit: '%',
    help: 'Pad volume as a percentage of total fluid volume.',
    group: 'Reservoir Information',
  },
  {
    name: 'midPerfTVD',
    label: 'MidPerf TVD',
    type: 'number',
    min: 0,
    unit: 'ft',
    help: 'True vertical depth at the midpoint of perforations.',
    group: 'Reservoir Information',
  },
  {
    name: 'numberOfPerfs',
    label: 'No. of Perforations',
    type: 'number',
    min: 0,
    step: 1,
    group: 'Reservoir Information',
  },
  {
    name: 'maxDeviation',
    label: 'Max Deviation',
    type: 'number',
    min: 0,
    max: 90,
    step: 0.1,
    unit: '°',
    help: 'Maximum wellbore deviation in degrees.',
    group: 'Reservoir Information',
  },
  {
    name: 'averageReservoirPressure',
    label: 'Avg Reservoir Pressure',
    type: 'number',
    min: 0,
    unit: 'psi',
    group: 'Reservoir Information',
  },
  {
    name: 'bhst',
    label: 'BHST',
    type: 'number',
    min: 0,
    unit: '°F',
    help: 'Bottom hole static temperature.',
    group: 'Reservoir Information',
  },
  {
    name: 'averagePorosity',
    label: 'Avg Porosity',
    type: 'number',
    min: 0,
    max: 100,
    step: 0.1,
    unit: '%',
    group: 'Reservoir Information',
  },
];

export const STAGE_FIELDS: FieldDefinition[] = [
  { name: 'stage', label: 'Stage', type: 'number', min: 1, step: 1, required: true, group: 'Stages' },
  { name: 'perfTop', label: 'Perf Top', type: 'number', min: 0, unit: 'ft', required: true, group: 'Stages' },
  { name: 'perfBottom', label: 'Perf Bottom', type: 'number', min: 0, unit: 'ft', required: true, group: 'Stages' },
  { name: 'padPercent', label: 'Pad %', type: 'number', min: 0, max: 100, step: 0.1, unit: '%', group: 'Stages' },
  { name: 'fluidVolume', label: 'Fluid Volume', type: 'number', min: 0, unit: 'bbl', group: 'Stages' },
  { name: 'proppantAmount', label: 'Proppant', type: 'number', min: 0, unit: 'lb', group: 'Stages' },
  { name: 'rate', label: 'Rate', type: 'number', min: 0, unit: 'bpm', group: 'Stages' },
  { name: 'pressure', label: 'Pressure', type: 'number', min: 0, unit: 'psi', group: 'Stages' },
];

export const COMPLETION_FIELDS: FieldDefinition[] = [
  { name: 'wellNameUWI', label: 'Well Name / UWI', type: 'text', required: true, group: 'Completion' },
  { name: 'wellType', label: 'Well Type', type: 'select', options: [], required: true, group: 'Completion' },
  { name: 'casingSize', label: 'Casing Size', type: 'number', min: 0, unit: 'in', group: 'Completion' },
  { name: 'tubingDPSize', label: 'Tubing / DP Size', type: 'number', min: 0, unit: 'in', group: 'Completion' },
  { name: 'tubingDPGrade', label: 'Tubing / DP Grade', type: 'select', options: [], group: 'Completion' },
  { name: 'perfIntervalTop', label: 'Perf Interval Top', type: 'number', min: 0, unit: 'ft', group: 'Completion' },
  { name: 'perfIntervalBottom', label: 'Perf Interval Bottom', type: 'number', min: 0, unit: 'ft', group: 'Completion' },
  { name: 'entranceHoleSize', label: 'Entrance Hole Size', type: 'number', min: 0, unit: 'in', group: 'Completion' },
  { name: 'completionType', label: 'Completion Type', type: 'select', options: [], group: 'Completion' },
  { name: 'priorWorkovers', label: 'Prior Workovers', type: 'number', min: 0, step: 1, group: 'Completion' },
  { name: 'tripleCompoLog', label: 'Triple Compo Log', type: 'select', options: [], group: 'Completion' },
  { name: 'cpiLog', label: 'CPI Log', type: 'select', options: [], group: 'Completion' },
];
