import type { Approval, ProjectData } from './arthix-rules';
import { analyzeWithRulesEngine } from './rules-engine';
import type { PrevalidationState } from './prevalidation';
import { createAssessmentSnapshot } from './assessment';

export type DagApplicationStatus = 'draft' | 'submitted' | 'query' | 'approved';
export type OrchestrationNodeStatus = 'startable' | 'blocked' | 'in-progress' | 'approved';
export type OrchestrationInput = { project: ProjectData; statuses?: Record<string, DagApplicationStatus>; prevalidation?: PrevalidationState; slaStartedAt?: Record<string, string>; now?: number; approvalOverride?: Approval[] };
export type OrchestrationNode = { id: string; title: string; agency: string; serviceId: string; estimatedDays: number; remainingDays: number; deadline: string | null; escalated: boolean; status: OrchestrationNodeStatus; dependencies: string[]; dependencyTypes: Record<string, 'hard' | 'document_gate'>; blockedReasons: string[]; ragContext: string; sourceUrl: string };
export type OrchestrationEdge = { id: string; from: string; to: string; critical: boolean; parallel: boolean; synthetic?: 'entry' | 'terminal' };
export type OrchestrationResult = { generatedAt: string; rulesVersion: string; assessmentId: string; validationGate: 'ready' | 'not-started' | 'needs-review'; nodes: OrchestrationNode[]; edges: OrchestrationEdge[]; criticalPath: string[]; criticalPathDays: number; sequentialDays: number; savingsDays: number; parallelismPercent: number; parallelTracks: string[][]; targetDate: string | null };

const daysFor = (approval: Approval) => Math.max(1, Number(approval.timeline.match(/\d+/)?.[0] || 15));
function validationStatus(prevalidation?: PrevalidationState): OrchestrationResult['validationGate'] { if (!prevalidation) return 'not-started'; return prevalidation.dossierStatus === 'ready' ? 'ready' : 'needs-review'; }

export function calculateOrchestration(input: OrchestrationInput): OrchestrationResult {
  const now = input.now || Date.now();
  const assessment = createAssessmentSnapshot(input.project, input.prevalidation);
  const analysis = analyzeWithRulesEngine(input.project);
  const approvals = input.approvalOverride || analysis.approvals;
  const byId = new Map(approvals.map(item => [item.id, item]));
  const statuses = input.statuses || {};
  const gate = validationStatus(input.prevalidation);
  const duration = new Map<string, number>();
  const pathFor = (id: string, seen = new Set<string>()): string[] => {
    if (seen.has(id)) return [id];
    const approval = byId.get(id); if (!approval) return [id];
    const next = new Set(seen); next.add(id);
    const dependencies = approval.dependencies.filter(dep => byId.has(dep));
    if (!dependencies.length) return [id];
    return [...dependencies.map(dep => pathFor(dep, next)).sort((a, b) => b.reduce((sum, key) => sum + daysFor(byId.get(key)!), 0) - a.reduce((sum, key) => sum + daysFor(byId.get(key)!), 0))[0], id];
  };
  const resolveDuration = (id: string): number => { if (duration.has(id)) return duration.get(id)!; const item = byId.get(id); if (!item) return 0; const value = daysFor(item) + Math.max(0, ...item.dependencies.filter(dep => byId.has(dep)).map(resolveDuration)); duration.set(id, value); return value; };
  const criticalPath = approvals.map(item => pathFor(item.id)).sort((a, b) => b.reduce((sum, key) => sum + daysFor(byId.get(key)!), 0) - a.reduce((sum, key) => sum + daysFor(byId.get(key)!), 0))[0] || [];
  const criticalSet = new Set(criticalPath);
  const nodes: OrchestrationNode[] = approvals.map(item => {
    const appStatus = statuses[item.id] || 'draft';
    const dependencies = item.dependencies.filter(dep => byId.has(dep));
    const unmet = dependencies.filter(dep => statuses[dep] !== 'approved');
    const reasons = unmet.map(dep => `${byId.get(dep)?.title || dep} must be approved first.`);
    if (gate !== 'ready') reasons.push(gate === 'not-started' ? 'Pre-validation dossier has not been completed.' : 'Resolve pre-validation discrepancies before routing.');
    const status: OrchestrationNodeStatus = appStatus === 'approved' ? 'approved' : appStatus === 'submitted' || appStatus === 'query' ? 'in-progress' : reasons.length ? 'blocked' : 'startable';
    const start = input.slaStartedAt?.[item.id] ? Date.parse(input.slaStartedAt[item.id]) : NaN;
    const deadline = Number.isFinite(start) ? new Date(start + daysFor(item) * 86400000).toISOString() : null;
    const remainingDays = deadline ? Math.ceil((Date.parse(deadline) - now) / 86400000) : daysFor(item);
    return { id: item.id, title: item.title, agency: item.agency, serviceId: item.serviceId, estimatedDays: daysFor(item), remainingDays: status === 'approved' ? 0 : Math.max(0, remainingDays), deadline, escalated: status !== 'approved' && !!deadline && Date.parse(deadline) < now, status, dependencies, dependencyTypes: Object.fromEntries(dependencies.map(dep => [dep, 'hard'])), blockedReasons: reasons, ragContext: reasons.length ? `Why is ${item.title} blocked? ${reasons.join(' ')}` : `${item.title} is startable because all dependencies and the validation gate are clear.`, sourceUrl: item.officialUrl };
  });
  const dependencyEdges: OrchestrationEdge[] = approvals.flatMap(item => item.dependencies.filter(dep => byId.has(dep)).map(dep => ({ id: `${dep}-${item.id}`, from: dep, to: item.id, critical: criticalSet.has(dep) && criticalSet.has(item.id) && criticalPath.indexOf(item.id) === criticalPath.indexOf(dep) + 1, parallel: !criticalSet.has(dep) || !criticalSet.has(item.id) })));
  const roots = approvals.filter(item => !item.dependencies.some(dep => byId.has(dep)));
  const leaves = approvals.filter(item => !approvals.some(candidate => candidate.dependencies.includes(item.id)));
  const edges: OrchestrationEdge[] = [...dependencyEdges, ...roots.map(item => ({ id: `entry-${item.id}`, from: 'entry', to: item.id, critical: criticalPath[0] === item.id, parallel: true, synthetic: 'entry' as const })), ...leaves.map(item => ({ id: `${item.id}-readiness`, from: item.id, to: 'readiness', critical: criticalPath[criticalPath.length - 1] === item.id, parallel: false, synthetic: 'terminal' as const }))];
  const sequentialDays = approvals.reduce((sum, item) => sum + daysFor(item), 0);
  const criticalPathDays = Math.max(0, ...approvals.map(item => resolveDuration(item.id)));
  const parallelTracks = approvals.filter(item => !item.dependencies.some(dep => byId.has(dep))).map(item => approvals.filter(candidate => candidate.serviceId === item.serviceId).map(candidate => candidate.id));
  const savingsDays = Math.max(0, sequentialDays - criticalPathDays);
  return { generatedAt: new Date(now).toISOString(), rulesVersion: analysis.engineVersion, assessmentId: assessment.id, validationGate: gate, nodes, edges, criticalPath, criticalPathDays, sequentialDays, savingsDays, parallelismPercent: sequentialDays ? Math.round((savingsDays / sequentialDays) * 100) : 0, parallelTracks, targetDate: criticalPathDays ? new Date(now + criticalPathDays * 86400000).toISOString() : null };
}
