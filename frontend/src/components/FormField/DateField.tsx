// Date input field.

import { FormField } from '@/components/FormField/FormField';

interface DateFieldProps {
  label: string;
  name: string;
  value: string;
  required?: boolean;
  help?: string;
  error?: string;
  onChange: (value: string) => void;
}

export function DateField({ label, name, value, required, help, error, onChange }: DateFieldProps) {
  return (
    <FormField label={label} name={name} required={required} help={help} error={error}>
      <input
        id={name}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={`field-input ${error ? 'field-input-error' : ''}`}
      />
    </FormField>
  );
}
