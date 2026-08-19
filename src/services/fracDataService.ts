// Service abstraction. Initially backed by localStorage; a future API can replace these implementations.

import type { FracDataService, FracFormData, SubmissionResult } from '@/types/fracTypes';
import { computeJobCostBreakdown } from '@/utils/calculations';
import { generateReferenceNumber } from '@/utils/formatters';
import {
  clearDraftFromStorage,
  loadDraftFromStorage,
  saveSubmission,
  saveDraftToStorage,
} from '@/utils/storage';

export const localFracDataService: FracDataService = {
  async saveDraft(data: FracFormData): Promise<void> {
    saveDraftToStorage({ ...data, lastModified: new Date().toISOString(), status: 'draft' });
  },

  async loadDraft(): Promise<FracFormData | null> {
    return loadDraftFromStorage();
  },

  async clearDraft(): Promise<void> {
    clearDraftFromStorage();
  },

  async submit(data: FracFormData): Promise<SubmissionResult> {
    const reference = generateReferenceNumber();
    const submittedAt = new Date().toISOString();
    const breakdown = computeJobCostBreakdown(data.jobCost);

    saveSubmission({
      reference,
      submittedAt,
      data: { ...data, status: 'submitted' },
    });

    // Clear the draft once submitted
    clearDraftFromStorage();

    return {
      reference,
      submittedAt,
      well: data.mainFracData.wellInfo.well,
      jobDate: data.mainFracData.wellInfo.jobDate,
      jobTotal: breakdown.total,
    };
  },
};
