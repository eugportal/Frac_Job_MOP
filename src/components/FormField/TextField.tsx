// Text input field bound to a string value.

import { FormField } from '@/components/FormField/FormField';

interface TextFieldProps {
  label: string;
  name: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  help?: string;
  error?: string;
  onChange: (value: string) => void;
}

export function TextField({ label, name, value, required, placeholder, help, error, onChange }: TextFieldProps) {
  return (
    <FormField label={label} name={name} required={required} help={help} error={error}>
      <input
        id={name}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={`field-input ${error ? 'field-input-error' : ''}`}
      />
    </FormField>
  );
}
