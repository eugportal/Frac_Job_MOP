// LocalStorage-backed persistence layer. Abstracted so a future API can replace it.

import type { FracFormData } from '@/types/fracTypes';

const DRAFT_KEY = 'frac-data-draft-v1';
const SUBMISSIONS_KEY = 'frac-data-submissions-v1';

export function saveDraftToStorage(data: FracFormData): void {
  try {
    const payload = JSON.stringify(data);
    localStorage.setItem(DRAFT_KEY, payload);
  } catch (e) {
    console.error('Failed to save draft', e);
    throw new Error('Unable to save draft. Storage may be full.');
  }
}

export function loadDraftFromStorage(): FracFormData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FracFormData;
  } catch (e) {
    console.error('Failed to load draft', e);
    return null;
  }
}

export function clearDraftFromStorage(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    console.error('Failed to clear draft', e);
  }
}

export interface StoredSubmission {
  reference: string;
  submittedAt: string;
  data: FracFormData;
}

export function saveSubmission(submission: StoredSubmission): void {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    const list: StoredSubmission[] = raw ? JSON.parse(raw) : [];
    list.push(submission);
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to store submission', e);
  }
}

export function loadSubmissions(): StoredSubmission[] {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
