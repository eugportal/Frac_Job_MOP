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
  disabled?: boolean;
  list?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export function TextField({ label, name, value, required, placeholder, help, error, disabled = false, list, onChange, onBlur }: TextFieldProps) {
  return (
    <FormField label={label} name={name} required={required} help={help} error={error}>
      <input
        id={name}
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        list={list}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={!!error}
        className={`field-input disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-400 ${error ? 'field-input-error' : ''}`}
      />
    </FormField>
  );
}
