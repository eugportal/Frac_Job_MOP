// Yes/No radio group bound to a boolean | null value.

import { FormField } from '@/components/FormField/FormField';

interface RadioGroupProps {
  label: string;
  name: string;
  value: boolean | null;
  required?: boolean;
  help?: string;
  error?: string;
  onChange: (value: boolean) => void;
}

export function RadioGroup({ label, name, value, required, help, error, onChange }: RadioGroupProps) {
  return (
    <FormField label={label} name={name} required={required} help={help} error={error}>
      <div className="flex items-center gap-4">
        {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map((opt) => (
          <label
            key={opt.l}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              value === opt.v
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-ink-300 bg-white text-ink-600 hover:border-ink-400'
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={value === opt.v}
              onChange={() => onChange(opt.v)}
              className="h-4 w-4 accent-brand-600"
            />
            {opt.l}
          </label>
        ))}
      </div>
    </FormField>
  );
}
