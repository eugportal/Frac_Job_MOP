// Core form model types for the Frac Data Management application.

export type FormStatus = 'draft' | 'in-progress' | 'submitted';

export type SectionStatus = 'not-started' | 'in-progress' | 'complete' | 'skipped' | 'error';

export interface WellInfo {
  well: string;
  field: string;
  regionArea: string;
  jobDate: string;
  onOffShore: string;
  fracVendor: string;
  rigName: string;
  dataSourceConfidence: string;
}

export interface ReportsDocumentation {
  jobDesignReport: boolean | null;
  postFracReport: boolean | null;
  technique: string;
}

export interface ReservoirInfo {
  formationName: string;
  lithology: string;
  wellType: string;
  jobType: string;
  stageNumber: number | null;
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

export interface CostLineItem {
  id: string;
  invoiceNo: string;
  invoiceAmount: number | null;
  remarks: string;
  quantity: number | null;
  unit: string;
  unitPrice: number | null;
  // Total is computed; stored only for convenience in drafts.
  total: number | null;
}

export interface SandPlugCost {
  id: string;
  invoiceNo: string;
  invoiceAmount: number | null;
  pumpingCharge: number | null;
  relatedCost: number | null;
  remarks: string;
}

export interface SimpleCostLine {
  id: string;
  description: string;
  quantity: number | null;
  unit: string;
  unitPrice: number | null;
  total: number | null;
  remarks: string;
}

export interface JobCost {
  enabled: boolean;
  skipped: boolean;
  fracMaterial: CostLineItem[];
  gelChemicals: CostLineItem[];
  crossLinkedGel: CostLineItem[];
  sandPlug: SandPlugCost[];
  fracEquipment: SimpleCostLine[];
  fracDHT: SimpleCostLine[];
  cleanOut: SimpleCostLine[];
  additional: SimpleCostLine[];
  /** Complete, column-level Job Cost worksheet entries. */
  workbookRows: WorkbookCostRow[];
}

export interface WorkbookCostRow {
  id: string;
  values: Record<string, string | number | null>;
}

export interface FracFormData {
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
