// Job Cost section — optional, with enable/skip gate, multiple cost categories, and auto-calculated totals.

import { useState } from 'react';
import { Plus, Trash2, CheckCircle2, DollarSign, Calculator } from 'lucide-react';
import type {
  CostLineItem,
  FracFormData,
  JobCost,
  SandPlugCost,
  SimpleCostLine,
} from '@/types/fracTypes';
import { TextField } from '@/components/FormField/TextField';
import { NumberField } from '@/components/FormField/NumberField';
import { SelectField } from '@/components/FormField/SelectField';
import { ConfirmationDialog } from '@/components/Modal/ConfirmationDialog';
import { WorkbookFieldGrid } from '@/components/FormField/WorkbookFieldGrid';
import { JOB_COST_GROUPS } from '@/data/workbookFields';
import { generateId, formatCurrency } from '@/utils/formatters';
import {
  computeJobCostBreakdown,
  computeCostLineTotal,
  computeSandPlugTotal,
  computeSimpleLineTotal,
} from '@/utils/calculations';
import {
  PROPPANT_TYPE_OPTIONS,
  GEL_TYPE_OPTIONS,
  CROSSLINK_GEL_OPTIONS,
  COST_UNIT_OPTIONS,
} from '@/data/dropdownOptions';

interface JobCostSectionProps {
  formData: FracFormData;
  setFormData: (updater: (prev: FracFormData) => FracFormData) => void;
}

export function JobCostSection({ formData, setFormData }: JobCostSectionProps) {
  const jc = formData.jobCost;
  const [deleteTarget, setDeleteTarget] = useState<{ category: keyof JobCost; id: string } | null>(null);

  const breakdown = computeJobCostBreakdown(jc);

  const setEnabled = (enabled: boolean, skipped = false) => {
    setFormData((prev) => ({
      ...prev,
      jobCost: { ...prev.jobCost, enabled, skipped },
    }));
  };
  const addWorkbookRow = () => setFormData((prev) => ({ ...prev, jobCost: { ...prev.jobCost, workbookRows: [...prev.jobCost.workbookRows, { id: generateId(), values: {} }] } }));
  const updateWorkbookRow = (id: string, key: string, value: string | number | null) => setFormData((prev) => ({
    ...prev,
    jobCost: { ...prev.jobCost, workbookRows: prev.jobCost.workbookRows.map((row) => row.id === id ? { ...row, values: { ...row.values, [key]: value } } : row) },
  }));
  const removeWorkbookRow = (id: string) => setFormData((prev) => ({ ...prev, jobCost: { ...prev.jobCost, workbookRows: prev.jobCost.workbookRows.filter((row) => row.id !== id) } }));

  const addLine = (category: keyof JobCost) => {
    setFormData((prev) => {
      const list = prev.jobCost[category] as unknown[];
      if (category === 'sandPlug') {
        const newLine: SandPlugCost = {
          id: generateId(),
          invoiceNo: '',
          invoiceAmount: null,
          pumpingCharge: null,
          relatedCost: null,
          remarks: '',
        };
        return { ...prev, jobCost: { ...prev.jobCost, [category]: [...list, newLine] } as JobCost };
      }
      if (category === 'fracMaterial' || category === 'gelChemicals' || category === 'crossLinkedGel') {
        const newLine: CostLineItem = {
          id: generateId(),
          invoiceNo: '',
          invoiceAmount: null,
          remarks: '',
          quantity: null,
          unit: 'lb',
          unitPrice: null,
          total: null,
        };
        return { ...prev, jobCost: { ...prev.jobCost, [category]: [...list, newLine] } as JobCost };
      }
      const newLine: SimpleCostLine = {
        id: generateId(),
        description: '',
        quantity: null,
        unit: 'ea',
        unitPrice: null,
        total: null,
        remarks: '',
      };
      return { ...prev, jobCost: { ...prev.jobCost, [category]: [...list, newLine] } as JobCost };
    });
  };

  const updateLine = (category: keyof JobCost, id: string, patch: Record<string, unknown>) => {
    setFormData((prev) => {
      const list = prev.jobCost[category] as { id: string }[];
      const updated = list.map((item) => (item.id === id ? { ...item, ...patch } : item));
      return { ...prev, jobCost: { ...prev.jobCost, [category]: updated } };
    });
  };

  const removeLine = (category: keyof JobCost, id: string) => {
    setFormData((prev) => {
      const list = prev.jobCost[category] as { id: string }[];
      const updated = list.filter((item) => item.id !== id);
      return { ...prev, jobCost: { ...prev.jobCost, [category]: updated } };
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    removeLine(deleteTarget.category, deleteTarget.id);
    setDeleteTarget(null);
  };

  // Gate screen
  if (!jc.enabled && !jc.skipped) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <DollarSign size={28} className="text-brand-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-ink-800">Do you want to add job cost information?</h3>
          <p className="mt-1 text-sm text-ink-500">This section is optional. You can skip it and submit without cost data.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" className="btn-primary" onClick={() => setEnabled(true)}>
            <Plus size={16} />
            Yes, Add Costs
          </button>
          <button type="button" className="btn-secondary" onClick={() => setEnabled(false, true)}>
            Skip
          </button>
        </div>
      </div>
    );
  }

  if (jc.skipped) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        <CheckCircle2 size={32} className="text-accent-500" />
        <p className="text-sm font-medium text-ink-600">Section skipped</p>
        <button type="button" className="btn-ghost text-sm" onClick={() => setEnabled(true)}>
          Add job cost data
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <button type="button" className="btn-ghost text-sm" onClick={() => setEnabled(false, true)}>
          Skip section
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-200 bg-brand-50 px-5 py-3">
          <div><h3 className="text-sm font-semibold text-ink-800">Workbook Cost Details</h3><p className="text-xs text-ink-500">All charge-level columns from the Job Cost worksheet.</p></div>
          <button type="button" onClick={addWorkbookRow} className="btn-primary py-1.5 text-xs"><Plus size={14} />Add Cost Row</button>
        </div>
        <div className="flex flex-col gap-6 p-5">
          {jc.workbookRows.length === 0 && <p className="text-sm text-ink-500">No detailed cost rows added yet.</p>}
          {jc.workbookRows.map((row, index) => <div key={row.id} className="rounded-lg border border-ink-200 p-4">
            <div className="mb-4 flex items-center justify-between"><h4 className="text-sm font-semibold text-ink-700">Cost Row {index + 1}</h4><button type="button" className="btn-ghost text-xs text-red-600" onClick={() => removeWorkbookRow(row.id)}><Trash2 size={14} />Remove</button></div>
            {JOB_COST_GROUPS.map((group) => <section key={group.title} className="mb-6 last:mb-0"><h5 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">{group.title}</h5><WorkbookFieldGrid fields={group.fields} values={row.values} prefix={`cost-${row.id}`} onChange={(key, value) => updateWorkbookRow(row.id, key, value)} /></section>)}
          </div>)}
        </div>
      </div>

      {/* FRAC Material */}
      <CostCategoryCard title="FRAC Material" onAdd={() => addLine('fracMaterial')}>
        {jc.fracMaterial.map((item) => (
          <CostLineRow
            key={item.id}
            item={item}
            showInvoice
            showProppantType
            total={computeCostLineTotal(item)}
            onUpdate={(patch) => updateLine('fracMaterial', item.id, patch)}
            onDelete={() => setDeleteTarget({ category: 'fracMaterial', id: item.id })}
          />
        ))}
      </CostCategoryCard>

      {/* Gel / Chemicals */}
      <CostCategoryCard title="Gel / Chemicals" onAdd={() => addLine('gelChemicals')}>
        {jc.gelChemicals.map((item) => (
          <CostLineRow
            key={item.id}
            item={item}
            showGelType
            total={computeCostLineTotal(item)}
            onUpdate={(patch) => updateLine('gelChemicals', item.id, patch)}
            onDelete={() => setDeleteTarget({ category: 'gelChemicals', id: item.id })}
          />
        ))}
      </CostCategoryCard>

      {/* Cross Linked Gel / Clear FRAC */}
      <CostCategoryCard title="Cross Linked Gel / Clear FRAC" onAdd={() => addLine('crossLinkedGel')}>
        {jc.crossLinkedGel.map((item) => (
          <CostLineRow
            key={item.id}
            item={item}
            showCrossLinkType
            total={computeCostLineTotal(item)}
            onUpdate={(patch) => updateLine('crossLinkedGel', item.id, patch)}
            onDelete={() => setDeleteTarget({ category: 'crossLinkedGel', id: item.id })}
          />
        ))}
      </CostCategoryCard>

      {/* Sand Plug */}
      <CostCategoryCard title="Sand Plug" onAdd={() => addLine('sandPlug')}>
        {jc.sandPlug.map((item) => (
          <SandPlugRow
            key={item.id}
            item={item}
            total={computeSandPlugTotal(item)}
            onUpdate={(patch) => updateLine('sandPlug', item.id, patch)}
            onDelete={() => setDeleteTarget({ category: 'sandPlug', id: item.id })}
          />
        ))}
      </CostCategoryCard>

      {/* FRAC Equipment */}
      <CostCategoryCard title="FRAC Equipment" onAdd={() => addLine('fracEquipment')}>
        {jc.fracEquipment.map((item) => (
          <SimpleCostRow
            key={item.id}
            item={item}
            total={computeSimpleLineTotal(item)}
            onUpdate={(patch) => updateLine('fracEquipment', item.id, patch)}
            onDelete={() => setDeleteTarget({ category: 'fracEquipment', id: item.id })}
          />
        ))}
      </CostCategoryCard>

      {/* FRAC DHT */}
      <CostCategoryCard title="FRAC DHT" onAdd={() => addLine('fracDHT')}>
        {jc.fracDHT.map((item) => (
          <SimpleCostRow
            key={item.id}
            item={item}
            total={computeSimpleLineTotal(item)}
            onUpdate={(patch) => updateLine('fracDHT', item.id, patch)}
            onDelete={() => setDeleteTarget({ category: 'fracDHT', id: item.id })}
          />
        ))}
      </CostCategoryCard>

      {/* Clean Out */}
      <CostCategoryCard title="Clean Out" onAdd={() => addLine('cleanOut')}>
        {jc.cleanOut.map((item) => (
          <SimpleCostRow
            key={item.id}
            item={item}
            total={computeSimpleLineTotal(item)}
            onUpdate={(patch) => updateLine('cleanOut', item.id, patch)}
            onDelete={() => setDeleteTarget({ category: 'cleanOut', id: item.id })}
          />
        ))}
      </CostCategoryCard>

      {/* Additional Costs */}
      <CostCategoryCard title="Additional Costs" onAdd={() => addLine('additional')}>
        {jc.additional.map((item) => (
          <SimpleCostRow
            key={item.id}
            item={item}
            total={computeSimpleLineTotal(item)}
            onUpdate={(patch) => updateLine('additional', item.id, patch)}
            onDelete={() => setDeleteTarget({ category: 'additional', id: item.id })}
          />
        ))}
      </CostCategoryCard>

      {/* Job Total Summary */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink-200 bg-ink-50 px-5 py-3">
          <Calculator size={16} className="text-brand-600" />
          <h3 className="text-sm font-semibold text-ink-800">Job Total Summary</h3>
        </div>
        <div className="px-5 py-4">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            <SummaryRow label="FRAC Material" value={breakdown.fracMaterial} />
            <SummaryRow label="Gel / Chemicals" value={breakdown.gelChemicals} />
            <SummaryRow label="Cross Linked Gel" value={breakdown.crossLinkedGel} />
            <SummaryRow label="Sand Plug" value={breakdown.sandPlug} />
            <SummaryRow label="FRAC Equipment" value={breakdown.fracEquipment} />
            <SummaryRow label="FRAC DHT" value={breakdown.fracDHT} />
            <SummaryRow label="Clean Out" value={breakdown.cleanOut} />
            <SummaryRow label="Additional" value={breakdown.additional} />
          </dl>
          <div className="mt-4 flex items-center justify-between border-t-2 border-ink-200 pt-4">
            <span className="text-base font-bold text-ink-800">JOB TOTAL</span>
            <span className="text-xl font-bold text-brand-700">{formatCurrency(breakdown.total)}</span>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={!!deleteTarget}
        title="Delete Cost Line?"
        message="Are you sure you want to delete this cost line item? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ---- Sub-components ----

function CostCategoryCard({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50 px-5 py-3">
        <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
        <button type="button" onClick={onAdd} className="btn-secondary py-1 text-xs">
          <Plus size={14} />
          Add Line
        </button>
      </div>
      <div className="flex flex-col gap-4 px-5 py-4">
        {children}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <dt className="text-ink-600">{label}</dt>
      <dd className="font-semibold text-ink-800">{formatCurrency(value)}</dd>
    </div>
  );
}

interface CostLineRowProps {
  item: CostLineItem;
  total: number;
  showInvoice?: boolean;
  showProppantType?: boolean;
  showGelType?: boolean;
  showCrossLinkType?: boolean;
  onUpdate: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
}

function CostLineRow({ item, total, showInvoice, showProppantType, showGelType, showCrossLinkType, onUpdate, onDelete }: CostLineRowProps) {
  return (
    <div className="rounded-lg border border-ink-200 bg-ink-50/50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {showInvoice && (
          <TextField label="Invoice No" name={`inv-${item.id}`} value={item.invoiceNo} placeholder="INV-0001" onChange={(v) => onUpdate({ invoiceNo: v })} />
        )}
        {showProppantType && (
          <SelectField label="Proppant Type" name={`propType-${item.id}`} value={item.remarks} options={PROPPANT_TYPE_OPTIONS} onChange={(v) => onUpdate({ remarks: v })} />
        )}
        {showGelType && (
          <SelectField label="Gel Type" name={`gelType-${item.id}`} value={item.remarks} options={GEL_TYPE_OPTIONS} onChange={(v) => onUpdate({ remarks: v })} />
        )}
        {showCrossLinkType && (
          <SelectField label="Type" name={`xlinkType-${item.id}`} value={item.remarks} options={CROSSLINK_GEL_OPTIONS} onChange={(v) => onUpdate({ remarks: v })} />
        )}
        <NumberField label="Quantity" name={`qty-${item.id}`} value={item.quantity} min={0} onChange={(v) => onUpdate({ quantity: v })} />
        <SelectField label="Unit" name={`unit-${item.id}`} value={item.unit} options={COST_UNIT_OPTIONS} onChange={(v) => onUpdate({ unit: v })} />
        <NumberField label="Unit Price" name={`price-${item.id}`} value={item.unitPrice} min={0} unit="USD" onChange={(v) => onUpdate({ unitPrice: v })} />
        <div className="flex flex-col">
          <span className="field-label">Total</span>
          <div className="flex items-center justify-between rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-800">
            {formatCurrency(total)}
            <button type="button" onClick={onDelete} aria-label="Delete line" className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SandPlugRow({ item, total, onUpdate, onDelete }: { item: SandPlugCost; total: number; onUpdate: (patch: Record<string, unknown>) => void; onDelete: () => void }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-ink-50/50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField label="Invoice No" name={`sp-inv-${item.id}`} value={item.invoiceNo} placeholder="INV-0001" onChange={(v) => onUpdate({ invoiceNo: v })} />
        <NumberField label="Invoice Amount" name={`sp-invAmt-${item.id}`} value={item.invoiceAmount} min={0} unit="USD" onChange={(v) => onUpdate({ invoiceAmount: v })} />
        <NumberField label="Pumping Charge" name={`sp-pump-${item.id}`} value={item.pumpingCharge} min={0} unit="USD" onChange={(v) => onUpdate({ pumpingCharge: v })} />
        <NumberField label="Related Cost" name={`sp-rel-${item.id}`} value={item.relatedCost} min={0} unit="USD" onChange={(v) => onUpdate({ relatedCost: v })} />
        <div className="flex flex-col">
          <span className="field-label">Total</span>
          <div className="flex items-center justify-between rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-800">
            {formatCurrency(total)}
            <button type="button" onClick={onDelete} aria-label="Delete line" className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimpleCostRow({ item, total, onUpdate, onDelete }: { item: SimpleCostLine; total: number; onUpdate: (patch: Record<string, unknown>) => void; onDelete: () => void }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-ink-50/50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField label="Description" name={`desc-${item.id}`} value={item.description} placeholder="e.g. Pump truck rental" onChange={(v) => onUpdate({ description: v })} />
        <NumberField label="Quantity" name={`qty-${item.id}`} value={item.quantity} min={0} onChange={(v) => onUpdate({ quantity: v })} />
        <SelectField label="Unit" name={`unit-${item.id}`} value={item.unit} options={COST_UNIT_OPTIONS} onChange={(v) => onUpdate({ unit: v })} />
        <NumberField label="Unit Price" name={`price-${item.id}`} value={item.unitPrice} min={0} unit="USD" onChange={(v) => onUpdate({ unitPrice: v })} />
        <div className="flex flex-col">
          <span className="field-label">Total</span>
          <div className="flex items-center justify-between rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-800">
            {formatCurrency(total)}
            <button type="button" onClick={onDelete} aria-label="Delete line" className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
