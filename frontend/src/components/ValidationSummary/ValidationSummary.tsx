// Validation summary shown before/during submission. Clicking an error navigates to the field.

import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { FieldError } from '@/types/fracTypes';

interface ValidationSummaryProps {
  errors: FieldError[];
  sections: { id: string; label: string; complete: boolean }[];
  onErrorClick: (error: FieldError) => void;
}

export function ValidationSummary({ errors, sections, onErrorClick }: ValidationSummaryProps) {
  const errorCount = errors.length;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-ink-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-ink-800">Form Validation</h3>
      </div>
      <div className="px-5 py-4">
        <div className="space-y-2">
          {sections.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              {s.complete ? (
                <CheckCircle2 size={16} className="text-accent-500" />
              ) : (
                <AlertTriangle size={16} className="text-amber-500" />
              )}
              <span className={s.complete ? 'text-ink-700' : 'text-amber-700'}>{s.label}</span>
            </div>
          ))}
        </div>

        {errorCount > 0 && (
          <div className="mt-4 border-t border-ink-200 pt-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-600">
              <AlertCircle size={16} />
              {errorCount} {errorCount === 1 ? 'field requires attention' : 'fields require attention'}
            </div>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {errors.map((e, i) => (
                <li key={`${e.field}-${i}`}>
                  <button
                    type="button"
                    onClick={() => onErrorClick(e)}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs text-ink-600 transition-colors hover:bg-red-50 hover:text-red-700"
                  >
                    <AlertCircle size={12} className="mt-0.5 flex-shrink-0 text-red-400" />
                    <span>
                      <span className="font-medium">{e.label}:</span> {e.message}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {errorCount === 0 && (
          <div className="mt-4 flex items-center gap-2 border-t border-ink-200 pt-4 text-sm font-medium text-accent-600">
            <CheckCircle2 size={16} />
            All sections validated successfully.
          </div>
        )}
      </div>
    </div>
  );
}
