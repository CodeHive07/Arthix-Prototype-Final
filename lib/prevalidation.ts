import type { Project } from './udyog';

export type ExtractedEntity = { value: string; normalizedValue: string | number; confidence: number; sourceDocument: string; method: 'ocr' | 'manual'; unit?: string; normalizedSqM?: number };
export type ValidationDiscrepancy = { id: string; field: 'Premises' | 'Installed HP' | 'Land Area'; severity: 'error' | 'warning' | 'info'; message: string; sourceDocuments: string[]; resolved: boolean };
export type PrevalidationFile = { name: string; status: 'queued' | 'scanning' | 'validated' | 'unmatched' | 'error'; matchedDocumentId?: string; message?: string };
export type PrevalidationState = { documents: string[]; files?: PrevalidationFile[]; entities: Partial<Record<'Premises' | 'Installed HP' | 'Land Area', ExtractedEntity>>; discrepancies: ValidationDiscrepancy[]; updatedAt: string; dossierStatus: 'empty' | 'review' | 'ready' };
export type CrossCheckProfile = Pick<Project, 'landArea' | 'electricityLoadKw'>;

// Conversion constants kept exact so cross-document and cross-profile comparisons are deterministic.
export const landUnitSqM = { 'sq. m': 1, 'sq. ft': 0.09290304, 'sq. yd': 0.83612736, 'acres': 4046.8564224, 'hectares': 10000 } as const;
export type LandUnit = keyof typeof landUnitSqM;
export const KW_PER_HP = 0.745699872;

export function toSquareMeters(value: number, unit: LandUnit = 'sq. m'): number { return Math.round(value * landUnitSqM[unit] * 100) / 100; }
export function kilowattsFromHp(hp: number): number { return Math.round(hp * KW_PER_HP * 10) / 10; }

function relativeDelta(a: number, b: number): number { return a === b ? 0 : Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)); }

export function validateEntities(entities: PrevalidationState['entities'], project?: CrossCheckProfile): ValidationDiscrepancy[] {
  const result: ValidationDiscrepancy[] = [];
  const premises = entities.Premises;
  const hp = entities['Installed HP'];
  const land = entities['Land Area'];
  if (!premises) result.push({ id: 'premises-missing', field: 'Premises', severity: 'error', message: 'Premises could not be extracted from the dossier.', sourceDocuments: [], resolved: false });
  if (!hp) result.push({ id: 'hp-missing', field: 'Installed HP', severity: 'error', message: 'Installed HP is missing from the dossier.', sourceDocuments: [], resolved: false });
  if (!land) result.push({ id: 'land-missing', field: 'Land Area', severity: 'error', message: 'Land Area is missing from the dossier.', sourceDocuments: [], resolved: false });
  if (hp && typeof hp.normalizedValue === 'number' && hp.normalizedValue <= 0) result.push({ id: 'hp-invalid', field: 'Installed HP', severity: 'error', message: 'Installed HP must be greater than zero.', sourceDocuments: [hp.sourceDocument], resolved: false });
  if (land && typeof land.normalizedValue === 'number' && land.normalizedValue <= 0) result.push({ id: 'land-invalid', field: 'Land Area', severity: 'error', message: 'Land Area must be greater than zero.', sourceDocuments: [land.sourceDocument], resolved: false });
  if (premises && premises.confidence < .8) result.push({ id: 'premises-confidence', field: 'Premises', severity: 'warning', message: 'Premises extraction has low confidence and needs human review.', sourceDocuments: [premises.sourceDocument], resolved: false });
  if (hp && hp.confidence < .8) result.push({ id: 'hp-confidence', field: 'Installed HP', severity: 'warning', message: 'Installed HP extraction has low confidence and needs human review.', sourceDocuments: [hp.sourceDocument], resolved: false });
  if (land && land.confidence < .8) result.push({ id: 'land-confidence', field: 'Land Area', severity: 'warning', message: 'Land Area extraction has low confidence and needs human review.', sourceDocuments: [land.sourceDocument], resolved: false });
  const landSqM = land ? (typeof land.normalizedSqM === 'number' ? land.normalizedSqM : typeof land.normalizedValue === 'number' ? land.normalizedValue : undefined) : undefined;
  if (landSqM !== undefined && project?.landArea !== undefined && project.landArea > 0 && relativeDelta(landSqM, project.landArea) > .05) result.push({ id: 'land-profile-mismatch', field: 'Land Area', severity: 'warning', message: `Dossier land area (≈${landSqM} sq. m) differs from the project profile (${project.landArea} sq. m) by ${Math.round(relativeDelta(landSqM, project.landArea) * 100)}%. Verify the survey details or correct the project profile.`, sourceDocuments: [land!.sourceDocument], resolved: false });
  if (hp && typeof hp.normalizedValue === 'number' && hp.normalizedValue > 0 && project?.electricityLoadKw !== undefined && project.electricityLoadKw > 0) {
    const loadKw = kilowattsFromHp(hp.normalizedValue);
    if (loadKw > project.electricityLoadKw * 1.1) result.push({ id: 'hp-load-mismatch', field: 'Installed HP', severity: 'warning', message: `Installed HP (${hp.normalizedValue} HP ≈ ${loadKw} kW) exceeds the project profile electricity load (${project.electricityLoadKw} kW). Confirm the load sanction covers the machinery schedule.`, sourceDocuments: [hp.sourceDocument], resolved: false });
  }
  return result;
}

function differs(a: ExtractedEntity, b: ExtractedEntity): boolean {
  if (typeof a.normalizedValue === 'number' && typeof b.normalizedValue === 'number') return relativeDelta(a.normalizedValue, b.normalizedValue) > .05;
  return a.normalizedValue.toString().trim().toLowerCase() !== b.normalizedValue.toString().trim().toLowerCase();
}

// Picks the most confident extraction per field across sources instead of blind last-write-wins,
// and demotes confidence when sources disagree so a human review warning is raised downstream.
export function mergeEntities(existing: PrevalidationState['entities'], extracted: PrevalidationState['entities'][]): PrevalidationState['entities'] {
  const merged: PrevalidationState['entities'] = { ...existing };
  for (const field of ['Premises', 'Installed HP', 'Land Area'] as const) {
    const candidates = extracted.map(batch => batch[field]).filter(Boolean) as ExtractedEntity[];
    if (!candidates.length) continue;
    const best = candidates.reduce((a, b) => (b.confidence > a.confidence ? b : a));
    const conflict = (existing[field] && differs(existing[field]!, best)) || candidates.some(candidate => differs(candidate, best));
    merged[field] = conflict ? { ...best, confidence: Math.max(.5, best.confidence - .15) } : best;
  }
  return merged;
}

export function dossierStatus(discrepancies: ValidationDiscrepancy[], entities: PrevalidationState['entities']): PrevalidationState['dossierStatus'] { return Object.keys(entities).length === 3 && discrepancies.every(item => item.resolved || item.severity === 'info') ? 'ready' : Object.keys(entities).length ? 'review' : 'empty'; }

function parseNumber(raw: string): number { return Number(raw.replace(/,/g, '')); }

function normalizeLandUnit(raw?: string): LandUnit | undefined {
  if (!raw) return undefined;
  const unit = raw.toLowerCase().replace(/\s+/g, ' ').replace(/\./g, '').trim();
  if (/^acres?/.test(unit)) return 'acres';
  if (/^hectares?/.test(unit)) return 'hectares';
  if (/^sq (ft|feet)/.test(unit) || /^square (ft|feet)/.test(unit)) return 'sq. ft';
  if (/^sq yds?/.test(unit) || /^square yards?$/.test(unit)) return 'sq. yd';
  if (/^sq m(eters?|etres?)?$/.test(unit) || /^square m(eters?|etres?)?$/.test(unit) || unit === 'sqm') return 'sq. m';
  return undefined;
}

// Labeled patterns require an explicit "Field: value" separator and score higher confidence;
// loose keyword fallbacks still extract, but at a lower confidence so weak reads trigger human review.
export function extractEntities(text: string, source = 'uploaded dossier', project?: CrossCheckProfile) {
  const premisesMatch = text.match(/\b(?:premises|site|plot|address)\b\s*[:\-]\s*([^\n;]+)/i);
  const hpLabeled = text.match(/\b(?:installed|connected|sanctioned)?\s*hp\b\s*[:\-]\s*([\d,]+(?:\.\d+)?)\s*(?:hp\b)?/i);
  const hpLoose = hpLabeled ? undefined : text.match(/\b(?:installed\s+)?(?:hp|horsepower)\b\s*[:\-]?\s*([\d,]+(?:\.\d+)?)/i);
  const landLabeled = text.match(/\b(?:land|plot|site)\s*area\b\s*[:\-]\s*([\d,]+(?:\.\d+)?)\s*(acres?|hectares?|sq\.?\s*(?:ft|feet|m|yards?|yd)|sqm|square\s+(?:feet|meters?|metres?|yards?))?/i);
  const landLoose = landLabeled ? undefined : text.match(/\barea\b\s*[:\-]?\s*([\d,]+(?:\.\d+)?)\s*(acres?|hectares?|sq\.?\s*(?:ft|feet|m|yards?|yd)|sqm|square\s+(?:feet|meters?|metres?|yards?))?/i);
  const hpMatch = hpLabeled || hpLoose;
  const landMatch = landLabeled || landLoose;
  const entities: Partial<Record<'Premises' | 'Installed HP' | 'Land Area', ExtractedEntity>> = {};
  if (premisesMatch) entities.Premises = { value: premisesMatch[1].trim(), normalizedValue: premisesMatch[1].trim(), confidence: .94, sourceDocument: source, method: 'ocr' };
  if (hpMatch) entities['Installed HP'] = { value: `${hpMatch[1]} HP`, normalizedValue: parseNumber(hpMatch[1]), confidence: hpLabeled ? .91 : .72, sourceDocument: source, method: 'ocr' };
  if (landMatch) {
    const unit = normalizeLandUnit(landMatch[2]) ?? 'sq. m';
    const value = parseNumber(landMatch[1]);
    entities['Land Area'] = { value: `${value} ${unit}`, normalizedValue: value, confidence: landLabeled ? (landMatch[2] ? .92 : .8) : .7, sourceDocument: source, method: 'ocr', unit, normalizedSqM: toSquareMeters(value, unit) };
  }
  const discrepancies = validateEntities(entities, project);
  return { entities, discrepancies, dossierStatus: dossierStatus(discrepancies, entities), sourceDocument: source, extractedAt: new Date().toISOString() };
}
