// Validation hook — runs validation on demand and exposes errors keyed by field path.

import { useMemo, useState } from 'react';
import type { FieldError, FracFormData, ValidationResult } from '@/types/fracTypes';
import { validateForm } from '@/utils/validation';

export function useValidation(formData: FracFormData) {
  const [showErrors, setShowErrors] = useState(false);

  const result: ValidationResult = useMemo(() => validateForm(formData), [formData]);

  const errorsByField = useMemo(() => {
    const map = new Map<string, FieldError>();
    result.errors.forEach((e) => map.set(e.field, e));
    return map;
  }, [result]);

  const errorsBySection = useMemo(() => {
    const map = new Map<string, FieldError[]>();
    result.errors.forEach((e) => {
      const list = map.get(e.section) ?? [];
      list.push(e);
      map.set(e.section, list);
    });
    return map;
  }, [result]);

  return {
    errors: result.errors,
    isValid: result.isValid,
    errorsByField,
    errorsBySection,
    showErrors,
    setShowErrors,
  };
}
