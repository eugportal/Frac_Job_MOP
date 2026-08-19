// Main Frac Data section — well info, reports, reservoir info, and dynamic stages table.

import { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import type { FracFormData, StageRecord } from '@/types/fracTypes';
import { TextField } from '@/components/FormField/TextField';
import { NumberField } from '@/components/FormField/NumberField';
import { DateField } from '@/components/FormField/DateField';
import { SelectField } from '@/components/FormField/SelectField';
import { RadioGroup } from '@/components/FormField/RadioGroup';
import { DataTable, type Column } from '@/components/DataTable/DataTable';
import { Modal } from '@/components/Modal/Modal';
import { ConfirmationDialog } from '@/components/Modal/ConfirmationDialog';
import { WorkbookFieldGrid } from '@/components/FormField/WorkbookFieldGrid';
import { MAIN_WORKBOOK_GROUPS } from '@/data/workbookFields';
import { generateId } from '@/utils/formatters';
import {
  ON_OFFSHORE_OPTIONS,
  FRAC_VENDOR_OPTIONS,
  DATA_SOURCE_OPTIONS,
  TECHNIQUE_OPTIONS,
  LITHOLOGY_OPTIONS,
  WELL_TYPE_OPTIONS,
  JOB_TYPE_OPTIONS,
} from '@/data/dropdownOptions';

interface MainFracDataSectionProps {
  formData: FracFormData;
  setFormData: (updater: (prev: FracFormData) => FracFormData) => void;
  errorsByField: Map<string, { field: string; label: string; section: string; message: string }>;
  showErrors: boolean;
}

export function MainFracDataSection({ formData, setFormData, errorsByField, showErrors }: MainFracDataSectionProps) {
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<StageRecord | null>(null);
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);

  const w = formData.mainFracData.wellInfo;
  const r = formData.mainFracData.reservoir;
  const rep = formData.mainFracData.reports;

  const err = (field: string) => (showErrors ? errorsByField.get(field)?.message : undefined);

  const updateWellInfo = (key: keyof typeof w, value: string) => {
    setFormData((prev) => ({
      ...prev,
      mainFracData: { ...prev.mainFracData, wellInfo: { ...prev.mainFracData.wellInfo, [key]: value } },
    }));
  };

  const updateReservoir = (key: keyof typeof r, value: string | number | null) => {
    setFormData((prev) => ({
      ...prev,
      mainFracData: { ...prev.mainFracData, reservoir: { ...prev.mainFracData.reservoir, [key]: value } },
    }));
  };

  const updateReports = (key: keyof typeof rep, value: boolean | null | string) => {
    setFormData((prev) => ({
      ...prev,
      mainFracData: { ...prev.mainFracData, reports: { ...prev.mainFracData.reports, [key]: value } },
    }));
  };
  const updateWorkbookField = (key: string, value: string | number | null) => setFormData((prev) => ({
    ...prev,
    mainFracData: { ...prev.mainFracData, workbookFields: { ...prev.mainFracData.workbookFields, [key]: value } },
  }));

  // Stage management
  const openAddStage = () => {
    setEditingStage(null);
    setStageModalOpen(true);
  };

  const openEditStage = (stage: StageRecord) => {
    setEditingStage(stage);
    setStageModalOpen(true);
  };

  const saveStage = (stage: StageRecord) => {
    setFormData((prev) => {
      const existing = prev.mainFracData.stages.find((s) => s.id === stage.id);
      const stages = existing
        ? prev.mainFracData.stages.map((s) => (s.id === stage.id ? stage : s))
        : [...prev.mainFracData.stages, stage];
      return { ...prev, mainFracData: { ...prev.mainFracData, stages } };
    });
    setStageModalOpen(false);
  };

  const confirmDeleteStage = () => {
    if (!deleteStageId) return;
    setFormData((prev) => ({
      ...prev,
      mainFracData: {
        ...prev.mainFracData,
        stages: prev.mainFracData.stages.filter((s) => s.id !== deleteStageId),
      },
    }));
    setDeleteStageId(null);
  };

  const stageColumns: Column<StageRecord>[] = [
    { key: 'stage', header: 'Stage', accessor: (r) => r.stage, sortable: true },
    { key: 'perfTop', header: 'Perf Top (ft)', accessor: (r) => r.perfTop, sortable: true },
    { key: 'perfBottom', header: 'Perf Bottom (ft)', accessor: (r) => r.perfBottom, sortable: true },
    { key: 'padPercent', header: 'Pad %', accessor: (r) => r.padPercent },
    { key: 'fluidVolume', header: 'Fluid (bbl)', accessor: (r) => r.fluidVolume },
    { key: 'proppantAmount', header: 'Proppant (lb)', accessor: (r) => r.proppantAmount },
    { key: 'rate', header: 'Rate (bpm)', accessor: (r) => r.rate },
    { key: 'pressure', header: 'Pressure (psi)', accessor: (r) => r.pressure },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Well Information */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500">Well Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextField label="Well" name="well" value={w.well} required placeholder="e.g. KPC-001" error={err('well')} onChange={(v) => updateWellInfo('well', v)} />
          <TextField label="Field" name="field" value={w.field} required placeholder="e.g. KPC" error={err('field')} onChange={(v) => updateWellInfo('field', v)} />
          <TextField label="Region / Area" name="regionArea" value={w.regionArea} placeholder="e.g. Eastern Province" onChange={(v) => updateWellInfo('regionArea', v)} />
          <DateField label="Job Date" name="jobDate" value={w.jobDate} required error={err('jobDate')} onChange={(v) => updateWellInfo('jobDate', v)} />
          <SelectField label="On / Off Shore" name="onOffShore" value={w.onOffShore} required options={ON_OFFSHORE_OPTIONS} error={err('onOffShore')} onChange={(v) => updateWellInfo('onOffShore', v)} />
          <SelectField label="Frac Vendor" name="fracVendor" value={w.fracVendor} options={FRAC_VENDOR_OPTIONS} onChange={(v) => updateWellInfo('fracVendor', v)} />
          <TextField label="Rig Name / Rigless" name="rigName" value={w.rigName} placeholder="e.g. Rig-7" onChange={(v) => updateWellInfo('rigName', v)} />
          <SelectField label="Data Source / Confidence" name="dataSourceConfidence" value={w.dataSourceConfidence} options={DATA_SOURCE_OPTIONS} onChange={(v) => updateWellInfo('dataSourceConfidence', v)} />
        </div>
      </section>

      {/* Reports & Documentation */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500">Reports & Documentation</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RadioGroup label="Job Design Report" name="jobDesignReport" value={rep.jobDesignReport} onChange={(v) => updateReports('jobDesignReport', v)} />
          <RadioGroup label="Post Frac Report" name="postFracReport" value={rep.postFracReport} onChange={(v) => updateReports('postFracReport', v)} />
          <SelectField label="Technique" name="technique" value={rep.technique} options={TECHNIQUE_OPTIONS} onChange={(v) => updateReports('technique', v)} />
        </div>
      </section>

      {/* Reservoir Information */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500">Reservoir Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextField label="Formation Name" name="formationName" value={r.formationName} placeholder="e.g. Unayzah" onChange={(v) => updateReservoir('formationName', v)} />
          <SelectField label="Lithology" name="lithology" value={r.lithology} options={LITHOLOGY_OPTIONS} onChange={(v) => updateReservoir('lithology', v)} />
          <SelectField label="Well Type" name="reservoirWellType" value={r.wellType} required options={WELL_TYPE_OPTIONS} error={err('wellType')} onChange={(v) => updateReservoir('wellType', v)} />
          <SelectField label="Job Type" name="jobType" value={r.jobType} required options={JOB_TYPE_OPTIONS} error={err('jobType')} onChange={(v) => updateReservoir('jobType', v)} />
          <NumberField label="Stage #" name="stageNumber" value={r.stageNumber} min={1} step={1} error={err('stageNumber')} onChange={(v) => updateReservoir('stageNumber', v)} />
          <NumberField label="Pad %" name="padPercent" value={r.padPercent} min={0} max={100} step={0.1} unit="%" help="Pad volume as a percentage of total fluid volume." error={err('padPercent')} onChange={(v) => updateReservoir('padPercent', v)} />
          <NumberField label="MidPerf TVD" name="midPerfTVD" value={r.midPerfTVD} min={0} unit="ft" help="True vertical depth at the midpoint of perforations." error={err('midPerfTVD')} onChange={(v) => updateReservoir('midPerfTVD', v)} />
          <NumberField label="No. of Perforations" name="numberOfPerfs" value={r.numberOfPerfs} min={0} step={1} error={err('numberOfPerfs')} onChange={(v) => updateReservoir('numberOfPerfs', v)} />
          <NumberField label="Max Deviation" name="maxDeviation" value={r.maxDeviation} min={0} max={90} step={0.1} unit="°" help="Maximum wellbore deviation in degrees." error={err('maxDeviation')} onChange={(v) => updateReservoir('maxDeviation', v)} />
          <NumberField label="Avg Reservoir Pressure" name="averageReservoirPressure" value={r.averageReservoirPressure} min={0} unit="psi" error={err('averageReservoirPressure')} onChange={(v) => updateReservoir('averageReservoirPressure', v)} />
          <NumberField label="BHST" name="bhst" value={r.bhst} min={0} unit="°F" help="Bottom hole static temperature." error={err('bhst')} onChange={(v) => updateReservoir('bhst', v)} />
          <NumberField label="Avg Porosity" name="averagePorosity" value={r.averagePorosity} min={0} max={100} step={0.1} unit="%" error={err('averagePorosity')} onChange={(v) => updateReservoir('averagePorosity', v)} />
        </div>
      </section>

      {MAIN_WORKBOOK_GROUPS.map((group) => (
        <section key={group.title}>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500">{group.title}</h3>
          <WorkbookFieldGrid fields={group.fields} values={formData.mainFracData.workbookFields} prefix="main" onChange={updateWorkbookField} />
        </section>
      ))}

      {/* Stages */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Stages</h3>
          <button type="button" onClick={openAddStage} className="btn-secondary py-1.5">
            <Plus size={16} />
            Add Stage
          </button>
        </div>
        <DataTable
          columns={stageColumns}
          data={formData.mainFracData.stages}
          searchKeys={['stage']}
          searchPlaceholder="Search stages…"
          emptyMessage="No stages added yet. Click 'Add Stage' to begin."
          onEdit={openEditStage}
          onDelete={(row) => setDeleteStageId(row.id)}
        />
      </section>

      {/* Stage modal */}
      <StageModal
        open={stageModalOpen}
        stage={editingStage}
        nextStageNumber={formData.mainFracData.stages.length + 1}
        onClose={() => setStageModalOpen(false)}
        onSave={saveStage}
      />

      <ConfirmationDialog
        open={!!deleteStageId}
        title="Delete Stage?"
        message="Are you sure you want to delete this stage? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDeleteStage}
        onCancel={() => setDeleteStageId(null)}
      />
    </div>
  );
}

// ---- Stage edit modal ----

interface StageModalProps {
  open: boolean;
  stage: StageRecord | null;
  nextStageNumber: number;
  onClose: () => void;
  onSave: (stage: StageRecord) => void;
}

function StageModal({ open, stage, nextStageNumber, onClose, onSave }: StageModalProps) {
  const blank: StageRecord = {
    id: generateId(),
    stage: nextStageNumber,
    perfTop: null,
    perfBottom: null,
    padPercent: null,
    fluidVolume: null,
    proppantAmount: null,
    rate: null,
    pressure: null,
  };
  const [draft, setDraft] = useState<StageRecord>(stage ?? blank);

  // Re-sync when modal opens / stage changes
  const key = `${open}-${stage?.id ?? 'new'}`;
  const [syncKey, setSyncKey] = useState(key);
  if (syncKey !== key) {
    setSyncKey(key);
    setDraft(stage ?? blank);
  }

  const update = (k: keyof StageRecord, v: number | null) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={stage ? `Edit Stage ${stage.stage}` : 'Add Stage'}
      maxWidth="max-w-2xl"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={() => onSave(draft)}>
            <Pencil size={14} />
            Save Stage
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField label="Stage #" name="stage" value={draft.stage} min={1} step={1} required onChange={(v) => update('stage', v)} />
        <NumberField label="Perf Top" name="perfTop" value={draft.perfTop} min={0} unit="ft" required onChange={(v) => update('perfTop', v)} />
        <NumberField label="Perf Bottom" name="perfBottom" value={draft.perfBottom} min={0} unit="ft" required onChange={(v) => update('perfBottom', v)} />
        <NumberField label="Pad %" name="stagePadPercent" value={draft.padPercent} min={0} max={100} step={0.1} unit="%" onChange={(v) => update('padPercent', v)} />
        <NumberField label="Fluid Volume" name="fluidVolume" value={draft.fluidVolume} min={0} unit="bbl" onChange={(v) => update('fluidVolume', v)} />
        <NumberField label="Proppant" name="proppantAmount" value={draft.proppantAmount} min={0} unit="lb" onChange={(v) => update('proppantAmount', v)} />
        <NumberField label="Rate" name="rate" value={draft.rate} min={0} unit="bpm" onChange={(v) => update('rate', v)} />
        <NumberField label="Pressure" name="pressure" value={draft.pressure} min={0} unit="psi" onChange={(v) => update('pressure', v)} />
      </div>
    </Modal>
  );
}
