// Numeric input field. Stores raw numbers; rejects non-numeric input gracefully.

import { FormField } from '@/components/FormField/FormField';

interface NumberFieldProps {
  label: string;
  name: string;
  value: number | null;
  required?: boolean;
  unit?: string;
  placeholder:string
  min?: number;
  max?: number;
  step?: number;
  help?: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}

export function NumberField({
  label,
  name,
  value,
  required,
  unit,
  min,
  max,
  step,
  help,
  error,
  placeholder,
  disabled = false,
  onChange,
}: NumberFieldProps) {
  return (
    <FormField label={label} name={name} required={required} unit={unit} help={help} error={error}>
      <input
        id={name}
        type="number"
        value={value === null || value === undefined ? '' : value}
        min={min}
        max={max}
        step={step ?? 'any'}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange(null);
            return;
          }
          const num = Number(raw);
          if (isNaN(num)) return;
          onChange(num);
        }}
        aria-invalid={!!error}
        className={`field-input ${unit ? 'pr-12' : ''} ${error ? 'field-input-error' : ''} disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-500`}
      />
    </FormField>
  );
}
