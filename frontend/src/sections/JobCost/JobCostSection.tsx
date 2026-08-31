import { CheckCircle2, DollarSign } from 'lucide-react';
import type { FracFormData, JobCost } from '@/types/fracTypes';
import { NumberField } from '@/components/FormField/NumberField';
import { RadioGroup } from '@/components/FormField/RadioGroup';
import { formatCurrency } from '@/utils/formatters';
import { computeJobTotalCost } from '@/utils/calculations';

interface JobCostSectionProps {
  formData: FracFormData;
  setFormData: (updater: (prev: FracFormData) => FracFormData) => void;
}

export function JobCostSection({ formData, setFormData }: JobCostSectionProps) {
  const cost = formData.jobCost;
  const setEnabled = (enabled: boolean, skipped = false) => setFormData((prev) => ({
    ...prev, jobCost: { ...prev.jobCost, enabled, skipped },
  }));
  const update = <K extends keyof JobCost>(key: K, value: JobCost[K]) => setFormData((prev) => ({
    ...prev, jobCost: { ...prev.jobCost, [key]: value },
  }));

  if (!cost.enabled && !cost.skipped) return <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50"><DollarSign size={28} className="text-brand-500" /></div>
    <div><h3 className="text-base font-semibold text-ink-800">Do you want to add job cost information?</h3><p className="mt-1 text-sm text-ink-500">This section is optional.</p></div>
    <div className="flex gap-3"><button type="button" className="btn-primary" onClick={() => setEnabled(true)}>Yes, Add Costs</button><button type="button" className="btn-secondary" onClick={() => setEnabled(false, true)}>Skip</button></div>
  </div>;

  if (cost.skipped) return <div className="flex flex-col items-center justify-center gap-3 py-8 text-center"><CheckCircle2 size={32} className="text-accent-500" /><p className="text-sm font-medium text-ink-600">Section skipped</p><button type="button" className="btn-ghost text-sm" onClick={() => setEnabled(true)}>Add job cost data</button></div>;

  const total = computeJobTotalCost(cost);
  return <div className="flex flex-col gap-6">
    <div className="flex justify-end"><button type="button" className="btn-ghost text-sm" onClick={() => setEnabled(false, true)}>Skip section</button></div>
    <div className="card overflow-hidden">
      <div className="border-b border-ink-200 bg-brand-50 px-5 py-3"><h3 className="text-sm font-semibold text-ink-800">Job Cost</h3><p className="text-xs text-ink-500">Enter the job-level costs and operating details.</p></div>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField placeholder='' label="Frac Cost $" name="frac-cost" value={cost.fracCost} min={0} unit="USD" onChange={(value) => update('fracCost', value)} />
        <NumberField placeholder='' label="Fracpack Cost $" name="fracpack-cost" value={cost.fracpackCost} min={0} unit="USD" onChange={(value) => update('fracpackCost', value)} />
        <NumberField placeholder='' label="Job Operating Days" name="job-operating-days" value={cost.jobOperatingDays} min={0} step={1} onChange={(value) => update('jobOperatingDays', value)} />
        <NumberField placeholder='' label="Job Standby Days" name="job-standby-days" value={cost.jobStandbyDays} min={0} step={1} onChange={(value) => update('jobStandbyDays', value)} />
        <RadioGroup label="Acid Considered?" name="acid-considered" value={cost.acidConsidered} onChange={(value) => setFormData((prev) => ({ ...prev, jobCost: { ...prev.jobCost, acidConsidered: value, acidCost: value ? prev.jobCost.acidCost : null } }))} />
        <NumberField placeholder='' label="Acid Cost $" name="acid-cost" value={cost.acidCost} min={0} unit="USD" disabled={cost.acidConsidered === false} onChange={(value) => update('acidCost', value)} />
        <NumberField placeholder='' label="CT Cleaning Cost $" name="ct-cleaning-cost" value={cost.ctCleaningCost} min={0} unit="USD" onChange={(value) => update('ctCleaningCost', value)} />
        <NumberField placeholder='' label="CT/Lifting Cost $" name="ct-lifting-cost" value={cost.ctLiftingCost} min={0} unit="USD" onChange={(value) => update('ctLiftingCost', value)} />
        <NumberField placeholder='' label="Additional Cost $" name="additional-cost" value={cost.additionalCost} min={0} unit="USD" onChange={(value) => update('additionalCost', value)} />
        <div className="flex flex-col"><span className="field-label">Job Total Cost $</span><output className="field-input flex items-center bg-ink-50 font-semibold text-brand-700">{formatCurrency(total)}</output></div>
      </div>
    </div>
  </div>;
}
