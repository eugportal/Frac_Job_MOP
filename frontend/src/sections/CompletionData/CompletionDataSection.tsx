// Completion Data & Logs section — optional, with enable/skip gate and dynamic records table.

import { useState } from 'react';
import { Plus, Pencil, CheckCircle2, FileText } from 'lucide-react';
import type { CompletionRecord, FracFormData } from '@/types/fracTypes';
import { TextField } from '@/components/FormField/TextField';
import { NumberField } from '@/components/FormField/NumberField';
import { SelectField } from '@/components/FormField/SelectField';
import { DataTable, type Column } from '@/components/DataTable/DataTable';
import { Modal } from '@/components/Modal/Modal';
import { ConfirmationDialog } from '@/components/Modal/ConfirmationDialog';
import { WorkbookFieldGrid } from '@/components/FormField/WorkbookFieldGrid';
import { COMPLETION_WORKBOOK_FIELDS } from '@/data/workbookFields';
import { generateId } from '@/utils/formatters';
import {
  WELL_TYPE_OPTIONS,
  TUBING_GRADE_OPTIONS,
  COMPLETION_TYPE_OPTIONS,
  AVAILABILITY_OPTIONS,
} from '@/data/dropdownOptions';

interface CompletionDataSectionProps {
  formData: FracFormData;
  setFormData: (updater: (prev: FracFormData) => FracFormData) => void;
  errorsByField: Map<string, { field: string; label: string; section: string; message: string }>;
  showErrors: boolean;
}

export function CompletionDataSection({ formData, setFormData, errorsByField, showErrors }: CompletionDataSectionProps) {
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CompletionRecord | null>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);

  const cd = formData.completionData;
  const err = (field: string) => (showErrors ? errorsByField.get(field)?.message : undefined);

  const setEnabled = (enabled: boolean, skipped = false) => {
    setFormData((prev) => ({
      ...prev,
      completionData: { ...prev.completionData, enabled, skipped },
    }));
  };

  const openAddRecord = () => {
    setEditingRecord(null);
    setRecordModalOpen(true);
  };

  const openEditRecord = (rec: CompletionRecord) => {
    setEditingRecord(rec);
    setRecordModalOpen(true);
  };

  const saveRecord = (rec: CompletionRecord) => {
    setFormData((prev) => {
      const existing = prev.completionData.records.find((r) => r.id === rec.id);
      const records = existing
        ? prev.completionData.records.map((r) => (r.id === rec.id ? rec : r))
        : [...prev.completionData.records, rec];
      return { ...prev, completionData: { ...prev.completionData, records } };
    });
    setRecordModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteRecordId) return;
    setFormData((prev) => ({
      ...prev,
      completionData: {
        ...prev.completionData,
        records: prev.completionData.records.filter((r) => r.id !== deleteRecordId),
      },
    }));
    setDeleteRecordId(null);
  };

  // Gate screen
  if (!cd.enabled && !cd.skipped) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <FileText size={28} className="text-brand-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-ink-800">Do you want to add completion data?</h3>
          <p className="mt-1 text-sm text-ink-500">This section is optional. You can skip it and submit without completion data.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" className="btn-primary" onClick={() => setEnabled(true)}>
            <Plus size={16} />
            Yes, Add Data
          </button>
          <button type="button" className="btn-secondary" onClick={() => setEnabled(false, true)}>
            Skip
          </button>
        </div>
      </div>
    );
  }

  // Skipped state
  if (cd.skipped) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        <CheckCircle2 size={32} className="text-accent-500" />
        <p className="text-sm font-medium text-ink-600">Section skipped</p>
        <button type="button" className="btn-ghost text-sm" onClick={() => setEnabled(true)}>
          Add completion data
        </button>
      </div>
    );
  }

  const columns: Column<CompletionRecord>[] = [
    { key: 'wellNameUWI', header: 'Well Name / UWI', accessor: (r) => r.wellNameUWI, sortable: true },
    { key: 'wellType', header: 'Well Type', accessor: (r) => r.wellType, sortable: true },
    { key: 'casingSize', header: 'Casing (in)', accessor: (r) => r.casingSize },
    { key: 'tubingDPSize', header: 'Tubing/DP (in)', accessor: (r) => r.tubingDPSize },
    { key: 'perfIntervalTop', header: 'Perf Top (ft)', accessor: (r) => r.perfIntervalTop },
    { key: 'perfIntervalBottom', header: 'Perf Bottom (ft)', accessor: (r) => r.perfIntervalBottom },
    { key: 'completionType', header: 'Completion Type', accessor: (r) => r.completionType },
    { key: 'priorWorkovers', header: 'Workovers', accessor: (r) => r.priorWorkovers },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-600">
            {cd.records.length} {cd.records.length === 1 ? 'record' : 'records'} added
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-ghost text-sm" onClick={() => setEnabled(false, true)}>
            Skip section
          </button>
          <button type="button" className="btn-primary py-1.5" onClick={openAddRecord}>
            <Plus size={16} />
            Add Record
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={cd.records}
        searchKeys={['wellNameUWI', 'wellType', 'completionType']}
        searchPlaceholder="Search records…"
        emptyMessage="No completion records added yet."
        onEdit={openEditRecord}
        onDelete={(row) => setDeleteRecordId(row.id)}
      />

      <CompletionRecordModal
        open={recordModalOpen}
        record={editingRecord}
        onClose={() => setRecordModalOpen(false)}
        onSave={saveRecord}
        errorsByField={errorsByField}
        showErrors={showErrors}
        err={err}
      />

      <ConfirmationDialog
        open={!!deleteRecordId}
        title="Delete Record?"
        message="Are you sure you want to delete this completion record? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteRecordId(null)}
      />
    </div>
  );
}

// ---- Completion record modal ----

interface CompletionRecordModalProps {
  open: boolean;
  record: CompletionRecord | null;
  onClose: () => void;
  onSave: (rec: CompletionRecord) => void;
  errorsByField: Map<string, { field: string; label: string; section: string; message: string }>;
  showErrors: boolean;
  err: (field: string) => string | undefined;
}

function CompletionRecordModal({ open, record, onClose, onSave, err }: CompletionRecordModalProps) {
  const blank: CompletionRecord = {
    id: generateId(),
    wellNameUWI: '',
    wellType: '',
    casingSize: null,
    tubingDPSize: null,
    tubingDPGrade: '',
    perfIntervalTop: null,
    perfIntervalBottom: null,
    entranceHoleSize: null,
    completionType: '',
    priorWorkovers: null,
    tripleCompoLog: '',
    cpiLog: '',
    workbookFields: {},
  };
  const [draft, setDraft] = useState<CompletionRecord>(record ?? blank);

  const key = `${open}-${record?.id ?? 'new'}`;
  const [syncKey, setSyncKey] = useState(key);
  if (syncKey !== key) {
    setSyncKey(key);
    setDraft(record ?? blank);
  }

  const update = (k: keyof CompletionRecord, v: string | number | null) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={record ? 'Edit Completion Record' : 'Add Completion Record'}
      maxWidth="max-w-3xl"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={() => onSave(draft)}>
            <Pencil size={14} />
            Save Record
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TextField label="Well Name / UWI" name="wellNameUWI" value={draft.wellNameUWI} required placeholder="e.g. KPC-001" error={err(`completion[0].wellNameUWI`)} onChange={(v) => update('wellNameUWI', v)} />
        <SelectField label="Well Type" name="compWellType" value={draft.wellType} required options={WELL_TYPE_OPTIONS} error={err(`completion[0].wellType`)} onChange={(v) => update('wellType', v)} />
        <NumberField placeholder='' label="Casing Size" name="casingSize" value={draft.casingSize} min={0} unit="in" onChange={(v) => update('casingSize', v)} />
        <NumberField placeholder='' label="Tubing / DP Size" name="tubingDPSize" value={draft.tubingDPSize} min={0} unit="in" onChange={(v) => update('tubingDPSize', v)} />
        <SelectField label="Tubing / DP Grade" name="tubingDPGrade" value={draft.tubingDPGrade} options={TUBING_GRADE_OPTIONS} onChange={(v) => update('tubingDPGrade', v)} />
        <NumberField placeholder='' label="Perf Interval Top" name="perfIntervalTop" value={draft.perfIntervalTop} min={0} unit="ft" onChange={(v) => update('perfIntervalTop', v)} />
        <NumberField placeholder='' label="Perf Interval Bottom" name="perfIntervalBottom" value={draft.perfIntervalBottom} min={0} unit="ft" onChange={(v) => update('perfIntervalBottom', v)} />
        <NumberField placeholder='' label="Entrance Hole Size" name="entranceHoleSize" value={draft.entranceHoleSize} min={0} unit="in" onChange={(v) => update('entranceHoleSize', v)} />
        <SelectField label="Completion Type" name="completionType" value={draft.completionType} options={COMPLETION_TYPE_OPTIONS} onChange={(v) => update('completionType', v)} />
        <NumberField placeholder='' label="Prior Workovers" name="priorWorkovers" value={draft.priorWorkovers} min={0} step={1} onChange={(v) => update('priorWorkovers', v)} />
        <SelectField label="Triple Compo Log" name="tripleCompoLog" value={draft.tripleCompoLog} options={AVAILABILITY_OPTIONS} onChange={(v) => update('tripleCompoLog', v)} />
        <SelectField label="CPI Log" name="cpiLog" value={draft.cpiLog} options={AVAILABILITY_OPTIONS} onChange={(v) => update('cpiLog', v)} />
      </div>
      <section className="mt-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500">Logs, Survey & TCP Details</h3>
        <WorkbookFieldGrid fields={COMPLETION_WORKBOOK_FIELDS} values={draft.workbookFields} prefix="completion" onChange={(field, value) => setDraft((d) => ({ ...d, workbookFields: { ...d.workbookFields, [field]: value } }))} />
      </section>
    </Modal>
  );
}
