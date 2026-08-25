// Automatic financial calculations for the Job Cost section.

import type { JobCost } from '@/types/fracTypes';

/** The total is derived on the client and recalculated by the API; it is never user-editable. */
export function computeJobTotalCost(jobCost: JobCost): number {
  const total = (jobCost.fracCost ?? 0) + (jobCost.fracpackCost ?? 0) + (jobCost.acidCost ?? 0)
    + (jobCost.ctCleaningCost ?? 0) + (jobCost.ctLiftingCost ?? 0) + (jobCost.additionalCost ?? 0);
  return Math.round(total * 100) / 100;
}

/** Kept as a small compatibility wrapper for form review and local draft submission. */
export interface JobCostBreakdown {
  total: number;
}

export function computeJobCostBreakdown(jobCost: JobCost): JobCostBreakdown {
  return { total: computeJobTotalCost(jobCost) };
}
