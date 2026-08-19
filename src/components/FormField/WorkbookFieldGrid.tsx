import { NumberField } from './NumberField';
import { TextField } from './TextField';
import type { WorkbookField } from '@/data/workbookFields';

export function WorkbookFieldGrid({ fields, values, prefix, onChange }: { fields: WorkbookField[]; values: Record<string, string | number | null>; prefix: string; onChange: (key: string, value: string | number | null) => void }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {fields.map((field) => field.numeric ? <NumberField key={field.key} label={field.label} name={`${prefix}-${field.key}`} value={typeof values[field.key] === 'number' ? values[field.key] as number : null} min={0} onChange={(value) => onChange(field.key, value)} /> : <TextField key={field.key} label={field.label} name={`${prefix}-${field.key}`} value={String(values[field.key] ?? '')} onChange={(value) => onChange(field.key, value)} />)}
  </div>;
}
