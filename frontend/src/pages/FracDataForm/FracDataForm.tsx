// Main Frac Data Management form page — header, dashboard summary, progress, accordions, review & success screens.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Droplets,
  Save,
  Send,
  RotateCcw,
  CheckCircle2,
  FileText,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  PlusCircle,
  LogOut,
} from 'lucide-react';
import type { SubmissionResult } from '@/types/fracTypes';
import { useFormState } from '@/hooks/useFormState';
import { useAccordion } from '@/hooks/useAccordion';
import { useValidation } from '@/hooks/useValidation';
import { useAutoSave } from '@/hooks/useAutoSave';
import { computeProgress } from '@/utils/progress';
import { computeJobCostBreakdown } from '@/utils/calculations';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';
import { createFracDataService } from '@/services/fracDataService';
import { Accordion } from '@/components/Accordion/Accordion';
import { ProgressBar } from '@/components/ProgressBar/ProgressBar';
import { SaveStatus } from '@/components/SaveStatus/SaveStatus';
import { Modal } from '@/components/Modal/Modal';
import { ConfirmationDialog } from '@/components/Modal/ConfirmationDialog';
import { MainFracDataSection } from '@/sections/MainFracData/MainFracDataSection';
import { CompletionDataSection } from '@/sections/CompletionData/CompletionDataSection';
import { JobCostSection } from '@/sections/JobCost/JobCostSection';

type Screen = 'form' | 'review' | 'success';

interface FracDataFormProps {
  company: string;
  accessToken: string;
  onLogout: () => void;
  themeToggle: ReactNode;
}

export function FracDataForm({ company, accessToken, onLogout, themeToggle }: FracDataFormProps) {
  const { formData, setFormData, isDirty, saveDraft, resetForm, lastSaved } = useFormState();
  const { openId, toggle, setOpenId } = useAccordion('main');
  const validation = useValidation(formData);
  useAutoSave(formData, isDirty);

  const [screen, setScreen] = useState<Screen>('form');
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingAction] = useState<null | (() => void)>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const fracDataService = useMemo(() => createFracDataService(accessToken), [accessToken]);

  const progress = computeProgress(formData);
  const costBreakdown = computeJobCostBreakdown(formData.jobCost);

  useEffect(() => {
    setFormData((prev) => {
      if (prev.company === company && prev.mainFracData.workbookFields.company === company) {
        return prev;
      }

      return {
        ...prev,
        company,
        mainFracData: {
          ...prev.mainFracData,
          workbookFields: {
            ...prev.mainFracData.workbookFields,
            company,
            well: prev.mainFracData.wellInfo.well || prev.mainFracData.workbookFields.well || '',
          },
        },
      };
    });
  }, [company, setFormData]);

  // beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleSaveDraft = async () => {
    saveDraft();
    try { await fracDataService.saveDraft(formData); setSaveError(''); }
    catch (error) { setSaveError(error instanceof Error ? error.message : 'Unable to save the draft.'); }
  };

  const handleReset = () => {
    setResetDialogOpen(true);
  };

  const confirmReset = () => {
    resetForm();
    setScreen('form');
    setOpenId('main');
    setResetDialogOpen(false);
  };

  const handleSubmitClick = () => {
    validation.setShowErrors(true);
    if (!validation.isValid) {
      // Open the first accordion with errors
      const firstError = validation.errors[0];
      if (firstError?.section === 'Main Frac Data') setOpenId('main');
      else if (firstError?.section === 'Completion Data & Logs') setOpenId('completion');
      else if (firstError?.section === 'Job Cost') setOpenId('jobCost');
      return;
    }
    setReviewOpen(true);
  };

  const confirmSubmit = async () => {
    try {
      const result = await fracDataService.submit(formData);
      setSubmission(result); setReviewOpen(false); setScreen('success'); setSaveError('');
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Unable to submit the form.'); setReviewOpen(false); }
  };

  const startNewForm = () => {
    resetForm();
    setSubmission(null);
    setScreen('form');
    setOpenId('main');
  };

  // ---- Success screen ----
  if (screen === 'success' && submission) {
    return <SuccessScreen submission={submission} onNewForm={startNewForm} />;
  }

  const w = formData.mainFracData.wellInfo;

  return (
    <div className="min-h-screen bg-ink-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                <Droplets size={22} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-ink-900">Frac Data Management</h1>
                <p className="text-xs text-ink-500">Hydraulic Fracturing Data Collection</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge bg-brand-100 text-brand-700">{company}</span>
              {themeToggle}
              <SaveStatus isDirty={isDirty} lastSaved={lastSaved} />
              <button type="button" onClick={handleSaveDraft} className="btn-secondary">
                <Save size={16} />
                Save Draft
              </button>
              <button type="button" onClick={handleSubmitClick} className="btn-primary">
                <Send size={16} />
                Submit
              </button>
              <button type="button" onClick={onLogout} className="btn-ghost" aria-label="Sign out">
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Dashboard summary */}
        <div className="card mb-6 overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-y divide-ink-200 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
            <SummaryCell label="Well" value={w.well || '—'} />
            <SummaryCell label="Field" value={w.field || '—'} />
            <SummaryCell label="Job Date" value={formatDate(w.jobDate)} />
            <SummaryCell label="Status" value={formData.status === 'submitted' ? 'Submitted' : 'Draft'} />
            <SummaryCell label="Main Data" value={`${progress.mainData}%`} />
            <SummaryCell
              label="Job Cost"
              value={formData.jobCost.skipped ? 'Skipped' : formatCurrency(costBreakdown.total)}
            />
          </div>
        </div>
        {saveError && <p className="mb-4 text-sm font-medium text-red-600" role="alert">{saveError}</p>}

        {/* Progress */}
        <div className="card mb-6 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-700">Overall Progress</h2>
            <span className="text-2xl font-bold text-brand-700">{progress.overall}%</span>
          </div>
          <ProgressBar value={progress.overall} size="lg" showLabel={false} />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SectionProgress label="Main Data" value={progress.mainData} status={progress.mainStatus} />
            <SectionProgress label="Completion" value={progress.completion} status={progress.completionStatus} />
            <SectionProgress label="Job Cost" value={progress.jobCost} status={progress.jobCostStatus} />
          </div>
        </div>

        {/* Accordions */}
        <div className="flex flex-col gap-4">
          <Accordion
            id="main"
            index={1}
            title="Main Frac Data"
            badge={<SectionBadge status={progress.mainStatus} label="REQUIRED" required />}
            isOpen={openId === 'main'}
            onToggle={() => toggle('main')}
          >
            <MainFracDataSection
              accessToken={accessToken}
              formData={formData}
              setFormData={setFormData}
              errorsByField={validation.errorsByField}
              showErrors={validation.showErrors}
            />
          </Accordion>

          <Accordion
            id="completion"
            index={2}
            title="Completion Data & Logs"
            badge={<SectionBadge status={progress.completionStatus} label="OPTIONAL" />}
            isOpen={openId === 'completion'}
            onToggle={() => toggle('completion')}
          >
            <CompletionDataSection
              formData={formData}
              setFormData={setFormData}
              errorsByField={validation.errorsByField}
              showErrors={validation.showErrors}
            />
          </Accordion>

          <Accordion
            id="jobCost"
            index={3}
            title="Job Cost"
            badge={<SectionBadge status={progress.jobCostStatus} label="OPTIONAL" />}
            isOpen={openId === 'jobCost'}
            onToggle={() => toggle('jobCost')}
          >
            <JobCostSection formData={formData} setFormData={setFormData} />
          </Accordion>
        </div>

        {/* Sticky bottom actions */}
        <div className="sticky bottom-0 z-30 mt-6 -mx-4 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <button type="button" onClick={handleReset} className="btn-ghost">
              <RotateCcw size={16} />
              Reset
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleSaveDraft} className="btn-secondary">
                <Save size={16} />
                Save Draft
              </button>
              {openId !== 'jobCost' ? (
                <button
                  type="button"
                  onClick={() => setOpenId(openId === 'main' ? 'completion' : 'jobCost')}
                  className="btn-primary"
                >
                  Continue
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button type="button" onClick={handleSubmitClick} className="btn-primary">
                  <Send size={16} />
                  Submit
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Review modal */}
      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Review Submission"
        maxWidth="max-w-2xl"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setReviewOpen(false)}>
              <ChevronLeft size={16} />
              Back to Form
            </button>
            <button type="button" className="btn-primary" onClick={confirmSubmit}>
              <ClipboardCheck size={16} />
              Confirm & Submit
            </button>
          </>
        }
      >
        <ReviewContent formData={formData} costBreakdown={costBreakdown} />
      </Modal>

      {/* Reset confirmation */}
      <ConfirmationDialog
        open={resetDialogOpen}
        title="Reset Form?"
        message="All entered data will be removed. This action cannot be undone."
        confirmLabel="Reset"
        onConfirm={confirmReset}
        onCancel={() => setResetDialogOpen(false)}
      />

      {/* Unsaved changes guard */}
      <Modal
        open={unsavedDialogOpen}
        onClose={() => setUnsavedDialogOpen(false)}
        title="Unsaved Changes"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setUnsavedDialogOpen(false)}>
              Stay
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                saveDraft();
                setUnsavedDialogOpen(false);
                pendingAction?.();
              }}
            >
              <Save size={16} />
              Save Draft
            </button>
            <button
              type="button"
              className="btn bg-red-600 text-white shadow-sm hover:bg-red-700"
              onClick={() => {
                setUnsavedDialogOpen(false);
                pendingAction?.();
              }}
            >
              Leave
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-600">You have unsaved changes. Save your draft before leaving, or leave and lose the changes.</p>
      </Modal>
    </div>
  );
}

// ---- Sub-components ----

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-ink-800">{value}</dd>
    </div>
  );
}

function SectionProgress({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: string;
}) {
  const color = status === 'error' ? 'red' : status === 'skipped' ? 'ink' : status === 'complete' ? 'accent' : 'brand';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-ink-600">{label}</span>
        <span className="font-semibold text-ink-700">
          {status === 'skipped' ? 'Skipped' : status === 'not-started' ? 'Not started' : `${value}%`}
        </span>
      </div>
      <ProgressBar value={value} size="sm" color={color as 'brand' | 'accent' | 'amber' | 'red' | 'ink'} showLabel={false} />
    </div>
  );
}

function SectionBadge({ status, label, required }: { status: string; label: string; required?: boolean }) {
  const colorClass =
    status === 'complete'
      ? 'bg-accent-100 text-accent-700'
      : status === 'error'
        ? 'bg-red-100 text-red-700'
        : status === 'in-progress'
          ? 'bg-amber-100 text-amber-700'
          : status === 'skipped'
            ? 'bg-ink-100 text-ink-500'
            : 'bg-ink-100 text-ink-500';
  const statusText =
    status === 'complete'
      ? 'Complete'
      : status === 'error'
        ? 'Needs attention'
        : status === 'in-progress'
          ? 'In progress'
          : status === 'skipped'
            ? 'Skipped'
            : 'Not started';
  return (
    <span className="flex items-center gap-1.5">
      <span className={`badge ${colorClass}`}>{label}</span>
      {/* <span className={`badge ${required ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500'}`}>{label}</span> */}
    </span>
  );
}

function ReviewContent({
  formData,
  costBreakdown,
}: {
  formData: import('@/types/fracTypes').FracFormData;
  costBreakdown: import('@/utils/calculations').JobCostBreakdown;
}) {
  const w = formData.mainFracData.wellInfo;
  const r = formData.mainFracData.reservoir;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <ReviewItem label="Company" value={formData.company || '—'} />
        <ReviewItem label="Well" value={w.well || '—'} />
        <ReviewItem label="Field" value={w.field || '—'} />
        <ReviewItem label="Job Date" value={formatDate(w.jobDate)} />
        <ReviewItem label="On / Off Shore" value={w.onOffShore || '—'} />
        <ReviewItem label="Frac Vendor" value={w.fracVendor || '—'} />
        <ReviewItem label="Technique" value={formData.mainFracData.reports.technique || '—'} />
        <ReviewItem label="Formation" value={r.formationName || '—'} />
        <ReviewItem label="Well Type" value={r.wellType || '—'} />
      </div>

      <div className="rounded-lg border border-ink-200 bg-ink-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <FileText size={16} className="text-brand-600" />
          Main Frac Data
          <CheckCircle2 size={16} className="text-accent-500" />
        </div>
        <p className="mt-1 text-sm text-ink-600">{formData.mainFracData.stages.length} stage(s) entered</p>
      </div>

      <div className="rounded-lg border border-ink-200 bg-ink-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <FileText size={16} className="text-brand-600" />
          Completion Data
          {formData.completionData.skipped ? (
            <span className="badge bg-ink-100 text-ink-500">Skipped</span>
          ) : (
            <CheckCircle2 size={16} className="text-accent-500" />
          )}
        </div>
        <p className="mt-1 text-sm text-ink-600">
          {formData.completionData.skipped ? 'Section skipped' : `${formData.completionData.records.length} record(s)`}
        </p>
      </div>

      <div className="rounded-lg border border-ink-200 bg-ink-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <DollarSign size={16} className="text-brand-600" />
          Job Cost
          {formData.jobCost.skipped ? (
            <span className="badge bg-ink-100 text-ink-500">Skipped</span>
          ) : (
            <CheckCircle2 size={16} className="text-accent-500" />
          )}
        </div>
        <p className="mt-1 text-sm font-semibold text-ink-800">
          {formData.jobCost.skipped ? 'Section skipped' : formatCurrency(costBreakdown.total)}
        </p>
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="text-sm font-semibold text-ink-800">{value}</dd>
    </div>
  );
}

function SuccessScreen({ submission, onNewForm }: { submission: SubmissionResult; onNewForm: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-100 px-4">
      <div className="card w-full max-w-lg animate-slide-up p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-100">
          <CheckCircle2 size={36} className="text-accent-600" />
        </div>
        <h2 className="text-xl font-bold text-ink-900">Submission Successful</h2>
        <p className="mt-1 text-sm text-ink-500">Frac Data has been submitted successfully.</p>

        <div className="mt-6 rounded-lg border border-ink-200 bg-ink-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Reference Number</p>
          <p className="mt-1 text-lg font-bold text-brand-700">{submission.reference}</p>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
          <div className="rounded-lg border border-ink-200 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Company</dt>
            <dd className="text-sm font-semibold text-ink-800">{submission.company || '—'}</dd>
          </div>
          <div className="rounded-lg border border-ink-200 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Well</dt>
            <dd className="text-sm font-semibold text-ink-800">{submission.well || '—'}</dd>
          </div>
          <div className="rounded-lg border border-ink-200 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Job Date</dt>
            <dd className="text-sm font-semibold text-ink-800">{formatDate(submission.jobDate)}</dd>
          </div>
          <div className="rounded-lg border border-ink-200 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Submitted</dt>
            <dd className="text-sm font-semibold text-ink-800">{formatDateTime(submission.submittedAt)}</dd>
          </div>
          <div className="rounded-lg border border-ink-200 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Job Cost</dt>
            <dd className="text-sm font-semibold text-ink-800">{formatCurrency(submission.jobTotal)}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" className="btn-secondary">
            <FileText size={16} />
            View Summary
          </button>
          <button type="button" className="btn-primary" onClick={onNewForm}>
            <PlusCircle size={16} />
            Create New Form
          </button>
        </div>
      </div>
    </div>
  );
}
