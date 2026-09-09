import { analyzeWithRulesEngine } from './rules-engine';
import type { ProjectData } from './arthix-rules';
import type { PrevalidationState } from './prevalidation';

export type AssessmentSnapshot = ReturnType<typeof createAssessmentSnapshot>;
export type AssessmentDependency = { from: string; to: string; type: 'hard' | 'soft' | 'document_gate' | 'inspection_gate' | 'parallel_safe'; reason: string; sourceIds: string[] };

export function createAssessmentSnapshot(project: ProjectData, prevalidation?: PrevalidationState) {
  const analysis = analyzeWithRulesEngine(project);
  const facts = Object.entries(project).filter(([, value]) => value !== undefined && value !== null).map(([field, value]) => ({ field, value }));
  const missingFacts = ['investmentCr', 'landAreaSqM', 'builtUpAreaSqM', 'electricityLoadKw', 'sensitiveArea'].filter(field => project[field as keyof ProjectData] === undefined);
  const dependencies: AssessmentDependency[] = analysis.approvals.flatMap(approval => approval.dependencies.map(dep => ({ from: dep, to: approval.id, type: 'hard' as const, reason: `${approval.title} depends on ${dep}.`, sourceIds: [approval.sourceDocumentId || approval.id] })));
  return { id: `assessment-${project.caseId}-${analysis.engineVersion}`, project, generatedAt: new Date().toISOString(), engineVersion: analysis.engineVersion, facts, missingFacts, confidence: missingFacts.length > 2 ? 'medium' as const : 'high' as const, approvals: analysis.approvals, requiredDocuments: analysis.requiredDocuments, applicability: analysis.applicability, dependencies, prevalidation: prevalidation || null, sourceIds: analysis.versionSummary.sources };
}
