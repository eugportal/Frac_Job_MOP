// Main Frac Data section — well info, reports, reservoir info, and dynamic stages table.

import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import type { DocumentAttachment, FracFormData, StageRecord } from '@/types/fracTypes';
import { TextField } from '@/components/FormField/TextField';
import { NumberField } from '@/components/FormField/NumberField';
import { DateField } from '@/components/FormField/DateField';
import { SelectField } from '@/components/FormField/SelectField';
import { Modal } from '@/components/Modal/Modal';
import { ConfirmationDialog } from '@/components/Modal/ConfirmationDialog';
import { WorkbookFieldGrid } from '@/components/FormField/WorkbookFieldGrid';
import { MAIN_WORKBOOK_GROUPS } from '@/data/workbookFields';
import { getCompanyFields, getCompanyWells, getFracOptions } from '@/services/fracDataService';
import { generateId } from '@/utils/formatters';
import {
  ON_OFFSHORE_OPTIONS,
  FRAC_VENDOR_OPTIONS,
  DATA_SOURCE_OPTIONS,
  TECHNIQUES_BY_FRAC_VENDOR,
  LITHOLOGY_OPTIONS,
  WELL_TYPE_OPTIONS,
  REGION_AREA_OPTIONS,
} from '@/data/dropdownOptions';

interface MainFracDataSectionProps {
  accessToken: string;
  formData: FracFormData;
  setFormData: (updater: (prev: FracFormData) => FracFormData) => void;
  errorsByField: Map<string, { field: string; label: string; section: string; message: string }>;
  showErrors: boolean;
}

export function MainFracDataSection({ accessToken, formData, setFormData, errorsByField, showErrors }: MainFracDataSectionProps) {
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);

  const w = formData.mainFracData.wellInfo;
  const r = formData.mainFracData.reservoir;
  const rep = formData.mainFracData.reports;
  const [wellOptions, setWellOptions] = useState<Array<{ value: string; label: string; uwi: string | null }>>([]);
  const [fieldOptions, setFieldOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [techniquesByVendor, setTechniquesByVendor] = useState(TECHNIQUES_BY_FRAC_VENDOR);

  useEffect(() => {
    let active = true;
    Promise.all([getCompanyWells(accessToken), getCompanyFields(accessToken), getFracOptions(accessToken)]).then(([wells, fields, techniques]) => {
      if (active) { setWellOptions(wells); setFieldOptions(fields); if (Object.keys(techniques).length) setTechniquesByVendor(techniques); }
    }).catch(() => { if (active) { setWellOptions([]); setFieldOptions([]); } });
    return () => { active = false; };
  }, [accessToken]);

  const err = (field: string) => (showErrors ? errorsByField.get(field)?.message : undefined);

  const updateWellInfo = (key: keyof typeof w, value: string | number | boolean | null) => {
    setFormData((prev) => ({
      ...prev,
      mainFracData: {
        ...prev.mainFracData,
        workbookFields: {
          ...prev.mainFracData.workbookFields,
          ...(key === 'well' ? { well: String(value ?? '') } : {}),
        },
        wellInfo: {
          ...prev.mainFracData.wellInfo,
          [key]: value,
          ...(key === 'well' ? { wellEug: wellOptions.find((well) => well.value === value)?.uwi ?? '' } : {}),
        },
      },
    }));
  };

  const updateReservoir = (key: keyof typeof r, value: string | number | null) => {
    setFormData((prev) => ({
      ...prev,
      mainFracData: { ...prev.mainFracData, reservoir: { ...prev.mainFracData.reservoir, [key]: value } },
    }));
  };

  const updateReports = (key: keyof typeof rep, value: boolean | null | string | DocumentAttachment) => {
    setFormData((prev) => ({
      ...prev,
      mainFracData: { ...prev.mainFracData, reports: { ...prev.mainFracData.reports, [key]: value } },
    }));
  };
  const updateReportAttachment = (key: 'jobDesignReportAttachment' | 'postFracReportAttachment', file: File | null) => {
    const attachment: DocumentAttachment | null = file
      ? { name: file.name, type: file.type, size: file.size, lastModified: file.lastModified, file }
      : null;
    updateReports(key, attachment);
  };
  const updateWorkbookField = (key: string, value: string | number | null) => setFormData((prev) => {
    const workbookFields = { ...prev.mainFracData.workbookFields, [key]: value };
    if (key === 'beforeNetRate' || key === 'afterNetRate') {
      const before = workbookFields.beforeNetRate;
      const after = workbookFields.afterNetRate;
      workbookFields.foldIncreaseDeclineRate = typeof before === 'number' && typeof after === 'number' && before !== 0
        ? Number((((after - before) / before) * 100).toFixed(2))
        : null;
    }
    return { ...prev, mainFracData: { ...prev.mainFracData, workbookFields } };
  });

  // Stage management
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

  return (
    <div className="flex flex-col gap-8">
      {/* Well Information */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500">Well Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextField label="Well" name="well" value={w.well} required list="company-wells" placeholder="Search or select a well" error={err('well')} onChange={(v) => updateWellInfo('well', v)} />
          <datalist id="company-wells">{wellOptions.map((well) => <option key={well.value} value={well.value} />)}</datalist>
          <TextField label="Well EUG" name="wellEug" value={w.wellEug} placeholder="Matched to selected well" disabled onChange={(v) => updateWellInfo('wellEug', v)} />
          <TextField label="Field" name="field" value={w.field} required list="company-fields" placeholder="Search or select a field" error={err('field')} onChange={(v) => updateWellInfo('field', v)} />
          <datalist id="company-fields">{fieldOptions.map((field) => <option key={field.value} value={field.value} />)}</datalist>
          <SelectField label="Region / Area" name="regionArea" value={w.regionArea} options={REGION_AREA_OPTIONS} onChange={(v) => updateWellInfo('regionArea', v)} />
          <NumberField label="Latitude" name="latitude" value={w.latitude} step={0.000001} onChange={(v) => updateWellInfo('latitude', v)} />
          <NumberField label="Longitude" name="longitude" value={w.longitude} step={0.000001} onChange={(v) => updateWellInfo('longitude', v)} />
          <DateField label="Job Date" name="jobDate" value={w.jobDate} required error={err('jobDate')} onChange={(v) => updateWellInfo('jobDate', v)} />
          <SelectField label="On / Off Shore" name="onOffShore" value={w.onOffShore} required options={ON_OFFSHORE_OPTIONS} error={err('onOffShore')} onChange={(v) => updateWellInfo('onOffShore', v)} />
          <SelectField label="Frac Vendor" name="fracVendor" value={w.fracVendor} options={Object.keys(techniquesByVendor).length ? Object.keys(techniquesByVendor).map((value) => ({ value, label: value })) : FRAC_VENDOR_OPTIONS} onChange={(v) => { updateWellInfo('fracVendor', v); if (!(techniquesByVendor[v] ?? []).some((option) => option.value === rep.technique)) updateReports('technique', ''); }} />
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-ink-700"><input type="checkbox" checked={w.hasRigName} onChange={(event) => { updateWellInfo('hasRigName', event.target.checked); if (!event.target.checked) updateWellInfo('rigName', ''); }} className="h-4 w-4 rounded border-ink-300 text-brand-600" /> Has Rig Name?</label>
          {w.hasRigName && <TextField label="Rig Name" name="rigName" value={w.rigName} placeholder="e.g. Rig-7" onChange={(v) => updateWellInfo('rigName', v)} />}
          <SelectField label="Data Source / Confidence" name="dataSourceConfidence" value={w.dataSourceConfidence} options={DATA_SOURCE_OPTIONS} onChange={(v) => updateWellInfo('dataSourceConfidence', v)} />
        </div>
      </section>

      {/* Reports & Documentation */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500">Reports & Documentation</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <DocumentUpload label="Job Design Report" name="jobDesignReportFile" attachment={rep.jobDesignReportAttachment} onChange={(file) => { updateReports('jobDesignReport', !!file); updateReportAttachment('jobDesignReportAttachment', file); }} />
          </div>
          <div className="flex flex-col gap-2">
            <DocumentUpload label="Post Frac Report" name="postFracReportFile" attachment={rep.postFracReportAttachment} onChange={(file) => { updateReports('postFracReport', !!file); updateReportAttachment('postFracReportAttachment', file); }} />
          </div>
          <SelectField label="Technique" name="technique" value={rep.technique} options={techniquesByVendor[w.fracVendor] ?? []} placeholder={w.fracVendor ? 'Select technique' : 'Select a frac vendor first'} disabled={!w.fracVendor} onChange={(v) => updateReports('technique', v)} />
        </div>
      </section>

      {/* Reservoir Information */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500">Reservoir Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextField label="Formation Name" name="formationName" value={r.formationName} placeholder="e.g. Unayzah" onChange={(v) => updateReservoir('formationName', v)} />
          <SelectField label="Lithology" name="lithology" value={r.lithology} options={LITHOLOGY_OPTIONS} onChange={(v) => updateReservoir('lithology', v)} />
          <SelectField label="Well Type" name="reservoirWellType" value={r.wellType} required options={WELL_TYPE_OPTIONS} error={err('wellType')} onChange={(v) => updateReservoir('wellType', v)} />
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
        <section key={group.title ?? group.fields[0].key}>
          {group.title && <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500">{group.title}</h3>}
          <WorkbookFieldGrid fields={group.fields} values={formData.mainFracData.workbookFields} prefix="main" onChange={updateWorkbookField} />
        </section>
      ))}

      {/* Stages */}
      {/* <section>
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
      </section> */}

      {/* Stage modal */}
      <StageModal
        open={stageModalOpen}
        stage={null}
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

function DocumentUpload({ label, name, attachment, onChange }: { label: string; name: string; attachment: DocumentAttachment | null; onChange: (file: File | null) => void }) {
  return (
    <div className="rounded-lg border border-dashed border-brand-300 bg-brand-50 p-3">
      <label className="field-label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" className="mt-1 block w-full text-sm text-ink-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700" onChange={(event) => onChange(event.target.files?.[0] ?? null)} />
      {attachment && <p className="mt-2 text-xs font-medium text-accent-700">Attached: {attachment.name} ({Math.ceil(attachment.size / 1024)} KB)</p>}
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
          <button type="button" className="btn-danger" onClick={() => onSave(draft)}>
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
