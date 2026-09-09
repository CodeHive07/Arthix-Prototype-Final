import { governmentServices } from './government-services';

export type ProjectStage = 'Planning' | 'Established' | 'Operating';
export type ProjectSector = 'Manufacturing' | 'Food processing' | 'Services';
export type RuleStatus = 'active' | 'verify' | 'advisory';

export type ProjectData = {
  id?: string;
  name: string;
  sector: ProjectSector;
  district: string;
  stage: ProjectStage;
  workforce: number;
  effluent: boolean;
  caseId: string;
  foodBusiness?: boolean;
  buildingAreaSqM?: number;
  factoryPlanRequired?: boolean;
  hazardousMaterial?: boolean;
  groundwater?: boolean;
  electricityLoadKw?: number;
  boiler?: boolean;
  investmentCr?: number;
  landAreaSqM?: number;
  builtUpAreaSqM?: number;
  workerCount?: number;
  highVoltage?: boolean;
  sensitiveArea?: boolean;
  midcArea?: boolean;
  existingApprovals?: string[];
};

export type Approval = {
  id: string;
  title: string;
  agency: string;
  serviceId: string;
  required: boolean;
  reason: string;
  documents: string[];
  dependencies: string[];
  officialUrl: string;
  source: string;
  version: string;
  status: RuleStatus;
  timeline: string;
  timelineMetadata?: { kind: 'statutory' | 'rts' | 'internal_target' | 'estimate'; days?: number; unit: 'calendar_days' | 'working_days'; startsWhen: string; sourceUrl: string };
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  sourceDocumentId?: string;
};

export type RegulatoryRule = Approval & {
  applies: (project: ProjectData) => boolean;
};

const rule = (approval: Omit<Approval, 'officialUrl' | 'source' | 'version' | 'timeline' | 'timelineMetadata' | 'effectiveFrom' | 'effectiveTo' | 'sourceDocumentId'> & { serviceId: keyof typeof governmentServices; applies: RegulatoryRule['applies'] }): RegulatoryRule => {
  const service = governmentServices[approval.serviceId];
  return { ...approval, officialUrl: service.officialUrl, source: service.source, version: service.version, timeline: service.typicalTimeline, timelineMetadata: { kind: 'estimate', unit: 'calendar_days', startsWhen: 'complete_submission', sourceUrl: service.officialUrl }, effectiveFrom: null, effectiveTo: null, sourceDocumentId: service.id };
};

export const regulatoryRules: RegulatoryRule[] = [
  rule({ id: 'food-business', title: 'Food business approval', agency: 'Food Safety and Standards Authority of India', serviceId: 'fire', required: true, reason: 'Food processing or a declared food business requires an FSSAI licensing check before commercial food activity.', documents: ['entity', 'site', 'process'], dependencies: [], status: 'verify', applies: p => p.sector === 'Food processing' || p.foodBusiness === true }),
  rule({ id: 'building-approval', title: 'Building approval', agency: 'Local planning authority', serviceId: 'factoryPlan', required: true, reason: 'A new or modified industrial premise requires the local building and land-use approval route to be confirmed.', documents: ['entity', 'site'], dependencies: [], status: 'verify', applies: p => p.stage === 'Planning' && (p.sector !== 'Services' || (p.buildingAreaSqM ?? 0) > 0) }),
  rule({ id: 'factory-plan', title: 'Factory plan approval', agency: governmentServices.factoryPlan.department, serviceId: 'factoryPlan', required: true, reason: 'Manufacturing and declared factory premises prompt a plan approval check under the state factory safety route.', documents: ['entity', 'site', 'process'], dependencies: ['building-approval'], status: 'verify', applies: p => p.sector === 'Manufacturing' || p.factoryPlanRequired === true }),
  rule({ id: 'mpcb-cte', title: 'MPCB Consent to Establish', agency: governmentServices.mpcb.department, serviceId: 'mpcb', required: true, reason: 'Manufacturing or declared effluent prompts an MPCB consent applicability and category check.', documents: ['entity', 'site', 'process'], dependencies: [], status: 'verify', applies: p => p.sector !== 'Services' || p.effluent }),
  rule({ id: 'provisional-fire-safety', title: 'Provisional fire safety approval', agency: governmentServices.fire.department, serviceId: 'fire', required: true, reason: 'Industrial, food and larger premises should confirm whether provisional fire safety approval is required before construction or occupancy.', documents: ['entity', 'site', 'fire-plan'], dependencies: ['building-approval'], status: 'verify', applies: p => p.sector !== 'Services' || (p.buildingAreaSqM ?? 0) >= 500 }),
  rule({ id: 'boiler', title: 'Boiler registration and inspection', agency: 'Directorate of Steam Boilers, Maharashtra', serviceId: 'factoryPlan', required: true, reason: 'A declared boiler requires registration, inspection and operating permission checks.', documents: ['entity', 'boiler-record'], dependencies: ['factory-plan'], status: 'verify', applies: p => p.boiler === true }),
  rule({ id: 'groundwater', title: 'Groundwater permission', agency: 'Central Ground Water Authority', serviceId: 'mpcb', required: true, reason: 'A declared groundwater source requires the applicable abstraction permission and NOC route to be confirmed.', documents: ['entity', 'site', 'water-balance'], dependencies: [], status: 'verify', applies: p => p.groundwater === true }),
  rule({ id: 'electricity-connection', title: 'Electricity connection', agency: governmentServices.power.department, serviceId: 'power', required: true, reason: 'Industrial or food operations need a new or enhanced electricity supply assessment.', documents: ['entity', 'site', 'load-sanction'], dependencies: [], status: 'verify', applies: p => p.sector !== 'Services' || (p.electricityLoadKw ?? 0) > 0 }),
  rule({ id: 'hazardous-material', title: 'Hazardous material authorization', agency: 'Maharashtra Pollution Control Board', serviceId: 'mpcb', required: true, reason: 'Declared hazardous materials prompt storage, handling, transport and pollution-control authorization checks.', documents: ['entity', 'site', 'hazard-inventory', 'emergency-plan'], dependencies: ['mpcb-cte'], status: 'verify', applies: p => p.hazardousMaterial === true }),
];

export type ApplicabilityDecision = 'required' | 'potentially_applicable' | 'advisory' | 'not_applicable' | 'needs_confirmation';
export type ApplicabilityResult = { ruleId: string; decision: ApplicabilityDecision; triggerFacts: { field: string; value: unknown; explanation: string }[]; missingFacts: string[]; blockers: string[]; confidence: 'high' | 'medium' | 'low'; sourceIds: string[] };
export type ArthixAnalysis = { project: ProjectData; approvals: Approval[]; dependencyGraph: DependencyGraph; requiredDocuments: string[]; applicabilityReasons: Record<string, string>; applicability: ApplicabilityResult[]; versionSummary: VersionSummary };
export type DependencyGraph = { nodes: string[]; edges: { from: string; to: string }[] };
export type VersionSummary = { generatedAt: string; rules: Record<string, string>; sources: string[] };

export function approvalsForProject(project: ProjectData): Approval[] { return regulatoryRules.filter(r => r.applies(project)).map(({ applies: _applies, ...approval }) => approval); }
export function dependencyGraph(project: ProjectData): DependencyGraph { const approvals = approvalsForProject(project); return { nodes: approvals.map(a => a.id), edges: approvals.flatMap(a => a.dependencies.filter(d => approvals.some(x => x.id === d)).map(from => ({ from, to: a.id }))) }; }
export function requiredDocuments(project: ProjectData): string[] { return [...new Set(approvalsForProject(project).flatMap(a => a.documents))]; }
export function applicabilityReasons(project: ProjectData): Record<string, string> { return Object.fromEntries(regulatoryRules.filter(r => r.applies(project)).map(r => [r.id, r.reason])); }
export function versionSummary(project: ProjectData): VersionSummary { const approvals = approvalsForProject(project); return { generatedAt: new Date().toISOString(), rules: Object.fromEntries(approvals.map(a => [a.id, a.version])), sources: [...new Set(approvals.map(a => a.source))] }; }
export function evaluateApplicability(project: ProjectData): ApplicabilityResult[] {
  return regulatoryRules.map(rule => { const applies = rule.applies(project); const missingFacts: string[] = []; if (['mpcb-cte', 'hazardous-material'].includes(rule.id) && project.investmentCr === undefined) missingFacts.push('investmentCr'); if (['building-approval', 'provisional-fire-safety', 'groundwater'].includes(rule.id) && project.landAreaSqM === undefined) missingFacts.push('landAreaSqM'); if (['electricity-connection'].includes(rule.id) && project.electricityLoadKw === undefined) missingFacts.push('electricityLoadKw'); if (['mpcb-cte'].includes(rule.id) && project.sensitiveArea === undefined) missingFacts.push('sensitiveArea'); const decision: ApplicabilityDecision = rule.status === 'advisory' ? 'advisory' : applies && missingFacts.length ? 'needs_confirmation' : applies ? 'potentially_applicable' : 'not_applicable'; const triggerFacts = applies ? [{ field: 'sector', value: project.sector, explanation: `Project sector is ${project.sector}.` }, { field: 'stage', value: project.stage, explanation: `Project stage is ${project.stage}.` }, { field: 'district', value: project.district, explanation: `Project is located in ${project.district}.` }] : []; return { ruleId: rule.id, decision, triggerFacts, missingFacts, blockers: [], confidence: missingFacts.length ? 'medium' : applies ? 'high' : 'high', sourceIds: [rule.sourceDocumentId || rule.id] }; });
}
export function analyzeArthixProject(project: ProjectData): ArthixAnalysis { return { project, approvals: approvalsForProject(project), dependencyGraph: dependencyGraph(project), requiredDocuments: requiredDocuments(project), applicabilityReasons: applicabilityReasons(project), applicability: evaluateApplicability(project), versionSummary: versionSummary(project) }; }

export const analyzeProject = analyzeArthixProject;
export const getDependencyGraph = dependencyGraph;
export const getRequiredDocuments = requiredDocuments;
export const getApplicabilityReasons = applicabilityReasons;
export const getVersionSummary = versionSummary;

export type CurrentProject = { name: string; sector: ProjectSector; district: string; stage: ProjectStage; workforce: number; effluent: boolean; caseId: string };
export function projectToProjectData(project: CurrentProject): ProjectData {
  const profile = project as CurrentProject & Partial<ProjectData> & { wastewater?: boolean; hazardous?: boolean; workerCount?: number; landArea?: number; builtUpArea?: number; highVoltage?: boolean; sensitiveArea?: boolean; midcArea?: boolean };
  return {
    ...project,
    foodBusiness: project.sector === 'Food processing',
    buildingAreaSqM: profile.builtUpAreaSqM ?? profile.builtUpArea,
    factoryPlanRequired: profile.factoryPlanRequired,
    hazardousMaterial: profile.hazardousMaterial ?? profile.hazardous,
    groundwater: profile.groundwater,
    electricityLoadKw: profile.electricityLoadKw,
    boiler: profile.boiler,
    investmentCr: profile.investmentCr,
    landAreaSqM: profile.landAreaSqM ?? profile.landArea,
    builtUpAreaSqM: profile.builtUpAreaSqM ?? profile.builtUpArea,
    workerCount: profile.workerCount ?? profile.workforce,
    highVoltage: profile.highVoltage,
    sensitiveArea: profile.sensitiveArea,
    midcArea: profile.midcArea,
    effluent: profile.wastewater ?? profile.effluent,
  };
}
export const convertProjectToProjectData = projectToProjectData;
