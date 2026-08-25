// Controlled dropdown select field.

import { ChevronDown } from 'lucide-react';
import { FormField } from '@/components/FormField/FormField';
import type { Option } from '@/data/dropdownOptions';

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  required?: boolean;
  help?: string;
  error?: string;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function SelectField({
  label,
  name,
  value,
  required,
  help,
  error,
  options,
  placeholder = 'Select…',
  disabled = false,
  onChange,
}: SelectFieldProps) {
  return (
    <FormField label={label} name={name} required={required} help={help} error={error}>
      <div className="relative">
        <select
          id={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={!!error}
          className={`field-input appearance-none pr-9 ${error ? 'field-input-error' : ''} ${
            value === '' ? 'text-ink-400' : 'text-ink-900'
          } disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-400`}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="text-ink-900">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
      </div>
    </FormField>
  );
}
