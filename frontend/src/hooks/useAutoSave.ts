// Debounced auto-save hook. Saves the draft to localStorage after a period of inactivity.

import { useEffect, useRef } from 'react';
import type { FracFormData } from '@/types/fracTypes';
import { saveDraftToStorage } from '@/utils/storage';

export function useAutoSave(data: FracFormData, isDirty: boolean, delay = 8000) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirty) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveDraftToStorage({ ...data, lastModified: new Date().toISOString(), status: 'draft' });
    }, delay);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data, isDirty, delay]);
}
