// Client-side validation for the Frac Data form.

import type {
  CompletionRecord,
  FieldError,
  FracFormData,
  MainFracData,
  ValidationResult,
} from '@/types/fracTypes';

function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === '';
}

function isBlankNumber(value: number | null | undefined): boolean {
  return value === null || value === undefined || isNaN(value);
}

export function validateMainFracData(data: MainFracData): FieldError[] {
  const errors: FieldError[] = [];
  const section = 'Main Frac Data';

  const w = data.wellInfo;
  if (isBlank(w.well)) errors.push({ field: 'well', label: 'Well', section, message: 'Well is required.' });
  if (isBlank(w.field)) errors.push({ field: 'field', label: 'Field', section, message: 'Field is required.' });
  if (isBlank(w.jobDate)) errors.push({ field: 'jobDate', label: 'Job Date', section, message: 'Job Date is required.' });
  else if (isNaN(new Date(w.jobDate).getTime()))
    errors.push({ field: 'jobDate', label: 'Job Date', section, message: 'Job Date is not a valid date.' });
  if (isBlank(w.onOffShore))
    errors.push({ field: 'onOffShore', label: 'On / Off Shore', section, message: 'Select Onshore or Offshore.' });
  if (isBlank(String(data.workbookFields.jobSuccessClassification ?? '')))
    errors.push({ field: 'jobSuccessClassification', label: 'Job Success Classification', section, message: 'Job Success Classification is required.' });

  if (w.fracVendor === '' && !isBlank(w.fracVendor)) {
    // controlled select blank is okay
  }

  const r = data.reservoir;
  if (isBlank(r.wellType))
    errors.push({ field: 'wellType', label: 'Well Type', section, message: 'Well Type is required.' });

  // if (r.padPercent !== null && (r.padPercent < 0 || r.padPercent > 100))
  //   errors.push({ field: 'padPercent', label: 'Pad %', section, message: 'Pad % must be between 0 and 100.' });
  if (r.averagePorosity !== null && (r.averagePorosity < 0 || r.averagePorosity > 100))
    errors.push({ field: 'averagePorosity', label: 'Avg Porosity', section, message: 'Porosity must be between 0 and 100%.' });
  if (r.maxDeviation !== null && (r.maxDeviation < 0 || r.maxDeviation > 90))
    errors.push({ field: 'maxDeviation', label: 'Max Deviation', section, message: 'Max Deviation must be between 0 and 90°.' });
  if (r.averageReservoirPressure !== null && r.averageReservoirPressure < 0)
    errors.push({ field: 'averageReservoirPressure', label: 'Avg Reservoir Pressure', section, message: 'Pressure must be a positive value.' });
  if (r.bhst !== null && r.bhst < 0)
    errors.push({ field: 'bhst', label: 'BHST', section, message: 'Temperature must be a positive value.' });
  if (r.midPerfTVD !== null && r.midPerfTVD < 0)
    errors.push({ field: 'midPerfTVD', label: 'MidPerf TVD', section, message: 'TVD must be a positive value.' });
  if (r.numberOfPerfs !== null && r.numberOfPerfs < 0)
    errors.push({ field: 'numberOfPerfs', label: 'No. of Perforations', section, message: 'Number of perforations cannot be negative.' });

  // Stages: validate interval order
  data.stages.forEach((s, idx) => {
    if (s.perfTop !== null && s.perfBottom !== null && s.perfBottom <= s.perfTop) {
      errors.push({
        field: `stages[${idx}].perfBottom`,
        label: `Stage ${s.stage} Perf Bottom`,
        section,
        message: `Perf Bottom must be greater than Perf Top for Stage ${s.stage}.`,
      });
    }
    if (s.stage < 1) {
      errors.push({ field: `stages[${idx}].stage`, label: `Stage #`, section, message: 'Stage number must be at least 1.' });
    }
  });

  return errors;
}

export function validateCompletionRecord(rec: CompletionRecord, index: number): FieldError[] {
  const errors: FieldError[] = [];
  const section = 'Completion Data & Logs';

  if (isBlank(rec.wellNameUWI))
    errors.push({ field: `completion[${index}].wellNameUWI`, label: 'Well Name / UWI', section, message: `Record ${index + 1}: Well Name / UWI is required.` });
  if (isBlank(rec.wellType))
    errors.push({ field: `completion[${index}].wellType`, label: 'Well Type', section, message: `Record ${index + 1}: Well Type is required.` });
  if (rec.casingSize !== null && rec.casingSize < 0)
    errors.push({ field: `completion[${index}].casingSize`, label: 'Casing Size', section, message: `Record ${index + 1}: Casing Size cannot be negative.` });
  if (rec.perfIntervalTop !== null && rec.perfIntervalBottom !== null && rec.perfIntervalBottom <= rec.perfIntervalTop)
    errors.push({
      field: `completion[${index}].perfIntervalBottom`,
      label: 'Perf Interval Bottom',
      section,
      message: `Record ${index + 1}: Perf Interval Bottom must be greater than Top.`,
    });

  return errors;
}

export function validateForm(data: FracFormData): ValidationResult {
  const errors: FieldError[] = [];

  errors.push(...validateMainFracData(data.mainFracData));

  if (data.completionData.enabled && !data.completionData.skipped) {
    data.completionData.records.forEach((rec, idx) => {
      errors.push(...validateCompletionRecord(rec, idx));
    });
  }

  // Job cost validation: entered numeric values should be non-negative
  if (data.jobCost.enabled && !data.jobCost.skipped) {
    const section = 'Job Cost';
    const values: Array<[keyof typeof data.jobCost, string]> = [
      ['fracCost', 'Frac Cost'], ['fracpackCost', 'Fracpack Cost'], ['jobOperatingDays', 'Job Operating Days'],
      ['jobStandbyDays', 'Job Standby Days'], ['acidCost', 'Acid Cost'], ['ctCleaningCost', 'CT Cleaning Cost'],
      ['ctLiftingCost', 'CT/Lifting Cost'], ['additionalCost', 'Additional Cost'],
    ];
    values.forEach(([field, label]) => {
      const value = data.jobCost[field];
      if (typeof value === 'number' && value < 0)
        errors.push({ field: `jobCost.${field}`, label, section, message: `${label} cannot be negative.` });
    });
  }

  return { errors, isValid: errors.length === 0 };
}

export function hasMainDataStarted(data: MainFracData): boolean {
  const w = data.wellInfo;
  const r = data.reservoir;
  return (
    !isBlank(w.well) ||
    !isBlank(w.field) ||
    !isBlank(w.jobDate) ||
    !isBlank(w.onOffShore) ||
    !isBlank(w.fracVendor) ||
    !isBlank(r.formationName) ||
    !isBlank(r.wellType) ||
    data.stages.length > 0
  );
}

export function countFilledFields(data: MainFracData): { filled: number; total: number } {
  let filled = 0;
  let total = 0;

  const w = data.wellInfo;
  const wFields = [w.well, w.wellEug, w.field, w.regionArea, w.jobDate, w.onOffShore, w.fracVendor, w.rigName, w.dataSourceConfidence];
  wFields.forEach((v) => {
    total++;
    if (!isBlank(v)) filled++;
  });
  [w.latitude, w.longitude].forEach((v) => {
    total++;
    if (!isBlankNumber(v)) filled++;
  });

  const rep = data.reports;
  total += 3;
  if (rep.jobDesignReport !== null) filled++;
  if (rep.postFracReport !== null) filled++;
  if (!isBlank(rep.technique)) filled++;

  const r = data.reservoir;
  const rFields = [r.formationName, r.lithology, r.wellType];
  rFields.forEach((v) => {
    total++;
    if (!isBlank(v)) filled++;
  });
  const rNums = [r.padPercent, r.midPerfTVD, r.numberOfPerfs, r.maxDeviation, r.averageReservoirPressure, r.bhst, r.averagePorosity];
  rNums.forEach((v) => {
    total++;
    if (!isBlankNumber(v)) filled++;
  });

  return { filled, total };
}
