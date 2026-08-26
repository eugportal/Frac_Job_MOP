// Core form model types for the Frac Data Management application.

export type FormStatus = 'draft' | 'in-progress' | 'submitted';

export type SectionStatus = 'not-started' | 'in-progress' | 'complete' | 'skipped' | 'error';

export interface WellInfo {
  well: string;
  wellEug: string;
  field: string;
  regionArea: string;
  latitude: number | null;
  longitude: number | null;
  jobDate: string;
  onOffShore: string;
  fracVendor: string;
  hasRigName: boolean;
  rigName: string;
  dataSourceConfidence: string;
}

export interface ReportsDocumentation {
  jobDesignReport: boolean | null;
  postFracReport: boolean | null;
  jobDesignReportAttachment: DocumentAttachment | null;
  postFracReportAttachment: DocumentAttachment | null;
  technique: string;
}

/** Metadata for a document selected in the browser. The file itself is not persisted in localStorage. */
export interface DocumentAttachment {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  /** Present only while the user has selected the document in this browser. */
  file?: File;
}

export interface ReservoirInfo {
  formationName: string;
  lithology: string;
  wellType: string;
  padPercent: number | null;
  midPerfTVD: number | null;
  numberOfPerfs: number | null;
  maxDeviation: number | null;
  averageReservoirPressure: number | null;
  bhst: number | null;
  averagePorosity: number | null;
}

export interface StageRecord {
  id: string;
  stage: number;
  perfTop: number | null;
  perfBottom: number | null;
  padPercent: number | null;
  fluidVolume: number | null;
  proppantAmount: number | null;
  rate: number | null;
  pressure: number | null;
}

export interface MainFracData {
  wellInfo: WellInfo;
  reports: ReportsDocumentation;
  reservoir: ReservoirInfo;
  stages: StageRecord[];
  /** Workbook columns not represented by the core well/reservoir models. */
  workbookFields: Record<string, string | number | null>;
}

export interface CompletionRecord {
  id: string;
  wellNameUWI: string;
  wellType: string;
  casingSize: number | null;
  tubingDPSize: number | null;
  tubingDPGrade: string;
  perfIntervalTop: number | null;
  perfIntervalBottom: number | null;
  entranceHoleSize: number | null;
  completionType: string;
  priorWorkovers: number | null;
  tripleCompoLog: string;
  cpiLog: string;
  workbookFields: Record<string, string | number | null>;
}

export interface CompletionData {
  enabled: boolean;
  skipped: boolean;
  records: CompletionRecord[];
}

export interface JobCost {
  enabled: boolean;
  skipped: boolean;
  fracCost: number | null;
  fracpackCost: number | null;
  jobOperatingDays: number | null;
  jobStandbyDays: number | null;
  acidConsidered: boolean | null;
  acidCost: number | null;
  ctCleaningCost: number | null;
  ctLiftingCost: number | null;
  additionalCost: number | null;
}

export interface FracFormData {
  company: string;
  formId: string;
  status: FormStatus;
  lastModified: string;
  mainFracData: MainFracData;
  completionData: CompletionData;
  jobCost: JobCost;
}

export interface SubmissionResult {
  reference: string;
  submittedAt: string;
  company: string;
  well: string;
  jobDate: string;
  jobTotal: number;
}

export interface FieldError {
  field: string;
  label: string;
  section: string;
  message: string;
}

export interface ValidationResult {
  errors: FieldError[];
  isValid: boolean;
}

export interface FracDataService {
  saveDraft(data: FracFormData): Promise<void>;
  loadDraft(): Promise<FracFormData | null>;
  clearDraft(): Promise<void>;
  submit(data: FracFormData): Promise<SubmissionResult>;
}

export interface DraftMeta {
  lastModified: string;
  completionPercentage: number;
}
