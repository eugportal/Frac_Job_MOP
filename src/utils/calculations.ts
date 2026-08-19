// Automatic financial calculations for the Job Cost section.

import type {
  CostLineItem,
  JobCost,
  SandPlugCost,
  SimpleCostLine,
} from '@/types/fracTypes';

export function computeLineTotal(quantity: number | null, unitPrice: number | null): number {
  const q = quantity ?? 0;
  const p = unitPrice ?? 0;
  return Math.round(q * p * 100) / 100;
}

export function computeCostLineTotal(item: CostLineItem): number {
  return computeLineTotal(item.quantity, item.unitPrice);
}

export function computeSandPlugTotal(item: SandPlugCost): number {
  const invoice = item.invoiceAmount ?? 0;
  const pumping = item.pumpingCharge ?? 0;
  const related = item.relatedCost ?? 0;
  return Math.round((invoice + pumping + related) * 100) / 100;
}

export function computeSimpleLineTotal(item: SimpleCostLine): number {
  return computeLineTotal(item.quantity, item.unitPrice);
}

export function sumCostLines(items: CostLineItem[]): number {
  return items.reduce((sum, item) => sum + computeCostLineTotal(item), 0);
}

export function sumSandPlug(items: SandPlugCost[]): number {
  return items.reduce((sum, item) => sum + computeSandPlugTotal(item), 0);
}

export function sumSimpleLines(items: SimpleCostLine[]): number {
  return items.reduce((sum, item) => sum + computeSimpleLineTotal(item), 0);
}

export interface JobCostBreakdown {
  fracMaterial: number;
  gelChemicals: number;
  crossLinkedGel: number;
  sandPlug: number;
  fracEquipment: number;
  fracDHT: number;
  cleanOut: number;
  additional: number;
  total: number;
}

export function computeJobCostBreakdown(jobCost: JobCost): JobCostBreakdown {
  const fracMaterial = sumCostLines(jobCost.fracMaterial);
  const gelChemicals = sumCostLines(jobCost.gelChemicals);
  const crossLinkedGel = sumCostLines(jobCost.crossLinkedGel);
  const sandPlug = sumSandPlug(jobCost.sandPlug);
  const fracEquipment = sumSimpleLines(jobCost.fracEquipment);
  const fracDHT = sumSimpleLines(jobCost.fracDHT);
  const cleanOut = sumSimpleLines(jobCost.cleanOut);
  const additional = sumSimpleLines(jobCost.additional);

  const total =
    fracMaterial +
    gelChemicals +
    crossLinkedGel +
    sandPlug +
    fracEquipment +
    fracDHT +
    cleanOut +
    additional;

  return {
    fracMaterial: Math.round(fracMaterial * 100) / 100,
    gelChemicals: Math.round(gelChemicals * 100) / 100,
    crossLinkedGel: Math.round(crossLinkedGel * 100) / 100,
    sandPlug: Math.round(sandPlug * 100) / 100,
    fracEquipment: Math.round(fracEquipment * 100) / 100,
    fracDHT: Math.round(fracDHT * 100) / 100,
    cleanOut: Math.round(cleanOut * 100) / 100,
    additional: Math.round(additional * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
