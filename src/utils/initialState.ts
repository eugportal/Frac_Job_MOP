// Initial empty form state factory.

import type { FracFormData } from '@/types/fracTypes';
import { generateId } from './formatters';

export function createInitialFormState(): FracFormData {
  return {
    formId: generateId(),
    status: 'draft',
    lastModified: new Date().toISOString(),
    mainFracData: {
      wellInfo: {
        well: '',
        field: '',
        regionArea: '',
        jobDate: '',
        onOffShore: '',
        fracVendor: '',
        rigName: '',
        dataSourceConfidence: '',
      },
      reports: {
        jobDesignReport: null,
        postFracReport: null,
        technique: '',
      },
      reservoir: {
        formationName: '',
        lithology: '',
        wellType: '',
        jobType: '',
        stageNumber: null,
        padPercent: null,
        midPerfTVD: null,
        numberOfPerfs: null,
        maxDeviation: null,
        averageReservoirPressure: null,
        bhst: null,
        averagePorosity: null,
      },
      stages: [],
      workbookFields: {},
    },
    completionData: {
      enabled: false,
      skipped: false,
      records: [],
    },
    jobCost: {
      enabled: false,
      skipped: false,
      fracMaterial: [],
      gelChemicals: [],
      crossLinkedGel: [],
      sandPlug: [],
      fracEquipment: [],
      fracDHT: [],
      cleanOut: [],
      additional: [],
      workbookRows: [],
    },
  };
}

export function createMockDraft(): FracFormData {
  const base = createInitialFormState();
  return {
    ...base,
    mainFracData: {
      ...base.mainFracData,
      wellInfo: {
        ...base.mainFracData.wellInfo,
        well: 'KPC-001',
        field: 'KPC',
        regionArea: 'Eastern Province',
        jobDate: '2026-08-18',
        onOffShore: 'Onshore',
        fracVendor: 'Schlumberger',
        rigName: 'Rig-7',
        dataSourceConfidence: 'High Confidence',
      },
      reports: {
        jobDesignReport: true,
        postFracReport: true,
        technique: 'Hybrid',
      },
      reservoir: {
        ...base.mainFracData.reservoir,
        formationName: 'Unayzah',
        lithology: 'Sandstone',
        wellType: 'Vertical',
        jobType: 'Stimulation',
        stageNumber: 3,
        padPercent: 20,
        midPerfTVD: 6500,
        numberOfPerfs: 12,
        maxDeviation: 5.5,
        averageReservoirPressure: 4250,
        bhst: 210,
        averagePorosity: 18.5,
      },
      stages: [
        { id: generateId(), stage: 1, perfTop: 6500, perfBottom: 6580, padPercent: 20, fluidVolume: 1500, proppantAmount: 50000, rate: 35, pressure: 4500 },
        { id: generateId(), stage: 2, perfTop: 6580, perfBottom: 6660, padPercent: 25, fluidVolume: 1800, proppantAmount: 75000, rate: 40, pressure: 4600 },
      ],
    },
  };
}
