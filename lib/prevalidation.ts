export type ExtractedEntity = { value: string; normalizedValue: string | number; confidence: number; sourceDocument: string; method: 'ocr' | 'manual' };
export type ValidationDiscrepancy = { id: string; field: 'Premises' | 'Installed HP' | 'Land Area'; severity: 'error' | 'warning' | 'info'; message: string; sourceDocuments: string[]; resolved: boolean };
export type PrevalidationFile = { name: string; status: 'queued' | 'scanning' | 'validated' | 'unmatched' | 'error'; matchedDocumentId?: string; message?: string };
export type PrevalidationState = { documents: string[]; files?: PrevalidationFile[]; entities: Partial<Record<'Premises' | 'Installed HP' | 'Land Area', ExtractedEntity>>; discrepancies: ValidationDiscrepancy[]; updatedAt: string; dossierStatus: 'empty' | 'review' | 'ready' };

export function validateEntities(entities: PrevalidationState['entities']): ValidationDiscrepancy[] {
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
  return result;
}

export function dossierStatus(discrepancies: ValidationDiscrepancy[], entities: PrevalidationState['entities']): PrevalidationState['dossierStatus'] { return Object.keys(entities).length === 3 && discrepancies.every(item => item.resolved || item.severity === 'info') ? 'ready' : Object.keys(entities).length ? 'review' : 'empty'; }
