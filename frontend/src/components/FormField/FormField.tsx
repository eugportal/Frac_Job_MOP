// Shared field wrapper: label, required asterisk, help tooltip, unit suffix, and error message.

import { useState, type ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  name: string;
  required?: boolean;
  unit?: string;
  help?: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, name, required, unit, help, error, children }: FormFieldProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="flex flex-col">
      <label htmlFor={name} className="field-label">
        <span>
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
        {help && (
          <span className="relative">
            <button
              type="button"
              aria-label={`Help for ${label}`}
              onClick={() => setShowHelp((s) => !s)}
              onBlur={() => setShowHelp(false)}
              className="text-ink-400 transition-colors hover:text-brand-500"
            >
              <HelpCircle size={14} />
            </button>
            {showHelp && (
              <span
                role="tooltip"
                className="absolute left-0 top-6 z-30 w-56 rounded-lg bg-ink-900 px-3 py-2 text-xs font-normal text-white shadow-lg"
              >
                {help}
              </span>
            )}
          </span>
        )}
      </label>
      <div className="relative">
        {children}
        {unit && <span className="field-unit">{unit}</span>}
      </div>
      {error && (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
