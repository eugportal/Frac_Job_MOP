// Central form state hook — owns the FracFormData object, tracks dirty state, and exposes typed updaters.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FracFormData } from '@/types/fracTypes';
import { createInitialFormState } from '@/utils/initialState';
import { loadDraftFromStorage, saveDraftToStorage } from '@/utils/storage';

export function useFormState(initialData?: FracFormData) {
  const [formData, setFormData] = useState<FracFormData>(() => {
    if (initialData) return initialData;
    const draft = loadDraftFromStorage();
    return draft ?? createInitialFormState();
  });
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    setIsDirty(true);
  }, [formData]);

  const updateFormData = useCallback((updater: (prev: FracFormData) => FracFormData) => {
    setFormData((prev) => updater(prev));
  }, []);

  const saveDraft = useCallback(() => {
    saveDraftToStorage({ ...formData, lastModified: new Date().toISOString(), status: 'draft' });
    setIsDirty(false);
    setLastSaved(new Date());
  }, [formData]);

  const resetForm = useCallback(() => {
    const fresh = createInitialFormState();
    setFormData(fresh);
    setIsDirty(false);
  }, []);

  const loadDraft = useCallback(() => {
    const draft = loadDraftFromStorage();
    if (draft) {
      setFormData(draft);
      setIsDirty(false);
    }
  }, []);

  return {
    formData,
    setFormData: updateFormData,
    isDirty,
    saveDraft,
    resetForm,
    loadDraft,
    lastSaved,
  };
}
