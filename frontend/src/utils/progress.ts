// Progress calculation for the overall form and per-section.

import type { FracFormData, SectionStatus } from '@/types/fracTypes';
import { countFilledFields, hasMainDataStarted, validateMainFracData } from './validation';

export interface ProgressResult {
  overall: number;
  mainData: number;
  completion: number;
  jobCost: number;
  mainStatus: SectionStatus;
  completionStatus: SectionStatus;
  jobCostStatus: SectionStatus;
}

export function computeProgress(data: FracFormData): ProgressResult {
  // Main data
  const { filled, total } = countFilledFields(data.mainFracData);
  const mainErrors = validateMainFracData(data.mainFracData);
  const mainData = total > 0 ? Math.round((filled / total) * 100) : 0;
  let mainStatus: SectionStatus = 'not-started';
  if (mainErrors.length > 0) mainStatus = 'error';
  else if (mainData === 100) mainStatus = 'complete';
  else if (hasMainDataStarted(data.mainFracData)) mainStatus = 'in-progress';

  // Completion data
  let completion = 0;
  let completionStatus: SectionStatus = 'not-started';
  if (data.completionData.skipped) {
    completion = 100;
    completionStatus = 'skipped';
  } else if (data.completionData.enabled) {
    // Each record needs wellNameUWI + wellType at minimum; count records as complete if valid
    const recs = data.completionData.records;
    if (recs.length === 0) {
      completion = 0;
      completionStatus = 'in-progress';
    } else {
      let validRecs = 0;
      recs.forEach((r) => {
        if (r.wellNameUWI.trim() !== '' && r.wellType.trim() !== '') validRecs++;
      });
      completion = Math.round((validRecs / recs.length) * 100);
      completionStatus = completion === 100 ? 'complete' : 'in-progress';
    }
  }

  // Job cost
  let jobCost = 0;
  let jobCostStatus: SectionStatus = 'not-started';
  if (data.jobCost.skipped) {
    jobCost = 100;
    jobCostStatus = 'skipped';
  } else if (data.jobCost.enabled) {
    const values = [data.jobCost.fracCost, data.jobCost.fracpackCost, data.jobCost.jobOperatingDays,
      data.jobCost.jobStandbyDays, data.jobCost.acidConsidered, data.jobCost.acidCost,
      data.jobCost.ctCleaningCost, data.jobCost.ctLiftingCost, data.jobCost.additionalCost];
    const filled = values.filter((value) => value !== null).length;
    jobCost = Math.round((filled / values.length) * 100);
    jobCostStatus = filled === values.length ? 'complete' : 'in-progress';
  }

  // Overall: main weighted 60%, completion 20%, jobCost 20%. Skipped/optional sections count as complete.
  const mainWeight = 60;
  const optWeight = 20;
  const overall = Math.round(
    (mainData * mainWeight + completion * optWeight + jobCost * optWeight) / 100,
  );

  return {
    overall,
    mainData,
    completion,
    jobCost,
    mainStatus,
    completionStatus,
    jobCostStatus,
  };
}
