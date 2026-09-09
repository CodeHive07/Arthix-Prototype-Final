export type Role = 'Applicant' | 'Department officer' | 'Facilitation officer';
import { requiredDocuments as canonicalRequiredDocuments } from './arthix-rules';

export type Project = { name: string; sector: 'Manufacturing' | 'Food processing' | 'Services'; district: string; stage: 'Planning' | 'Established' | 'Operating'; workforce: number; effluent: boolean; caseId: string; projectType?: 'Greenfield' | 'Expansion' | 'Modernisation' | 'Operating unit'; investmentCr?: number; landArea?: number; builtUpArea?: number; workerCount?: number; electricityLoadKw?: number; wastewater?: boolean; boiler?: boolean; hazardous?: boolean; groundwater?: boolean; highVoltage?: boolean; sensitiveArea?: boolean };
export type Doc = { id: string; name: string; file: string; size: number; declaredName: string; checked: boolean };
export type Application = { status: 'draft' | 'submitted' | 'query' | 'approved'; messages: { role: Role; text: string; at: string }[]; approvedAt?: string; reminder?: string };
export type OfficialHandoff = { id: string; approvalId: string; authority: string; applicationReference: string; officialUrl: string; submittedAt: string; lastStatusAt: string; status: 'prepared' | 'submitted' | 'query' | 'approved' | 'rejected'; enteredBy: Role };
export type WorkflowQuery = { id: string; approvalId: string; subject: string; request: string; owner: 'Applicant' | 'Department'; raisedAt: string; respondedAt?: string; status: 'open' | 'responded' | 'closed' };
export type ApprovalCondition = { id: string; approvalId: string; text: string; dueDate?: string; status: 'open' | 'met' | 'not_applicable'; sourceUrl: string };
export type RevalidationTask = { id: string; amendmentId: string; approvalId: string; document?: string; owner: Role | 'Applicant'; status: 'open' | 'completed'; createdAt: string };
export type ApplicantProfile = { fullName: string; email: string; phone: string; completedAt: string };
export type Requirement = { id: string; title: string; short: string; agency: string; why: string; guidance: string; source: string; docs: string[]; dependencies: string[]; advisory?: boolean; blocked?: boolean };
export type IntelligenceFields = {
  engineProgress?: { rulesAcknowledged: boolean; prevalidationCompleted: boolean; dagCompleted: boolean };
  prevalidation?: import('./prevalidation').PrevalidationState;
  extractedEntities?: Record<string, string | number | boolean | null>;
  validationDiscrepancies?: { field: string; message: string; severity: 'info' | 'warning' | 'error' }[];
  versionMetadata?: { rulesVersion: string; generatedAt: string; sources: string[] };
  slaStartedAt?: Record<string, string>;
  inspectionAudit?: { id: string; at: string; actor: string; action: string; note?: string }[];
  impactAcknowledgements?: { amendmentId: string; acknowledgedAt: string; actor: Role | 'System'; revalidationRequired: boolean }[];
  handoffs?: OfficialHandoff[];
  workflowQueries?: WorkflowQuery[];
  conditions?: ApprovalCondition[];
  revalidationTasks?: RevalidationTask[];
};
export type State = { version: 1; project: Project; applicantProfile?: ApplicantProfile; documents: Doc[]; applications: Record<string, Application>; sources: string[]; inspections: { id: string; app: string; date: string; note: string; status: 'requested' | 'confirmed' | 'completed' }[]; grievances: { id: string; subject: string; text: string; at: string; status: 'Open' | 'In review' | 'Resolved'; response: string }[]; saved: string[]; activity: { id: string; at: string; role: Role | 'System'; text: string }[] } & IntelligenceFields;
export const STORAGE_KEY = 'arthix:workspace.v2';
export const sources = { mpcb: 'https://www.mpcb.gov.in/en/consentmgt/water-and-air-act', nsws: 'https://www.nsws.gov.in/', udyam: 'https://udyamregistration.gov.in/', maitri: 'https://maitri.maharashtra.gov.in/', schemes: 'https://www.myscheme.gov.in/' };

export { analyzeArthixProject, convertProjectToProjectData, projectToProjectData } from './arthix-rules';
export type { Approval, ProjectData, RegulatoryRule } from './arthix-rules';

export function requirements(p: Project): Requirement[] {
  const list: Requirement[] = [];
  if (p.sector !== 'Services' || p.effluent) {
    list.push({ id: 'cte', title: 'Consent to Establish', short: 'CTE', agency: 'Maharashtra Pollution Control Board', why: `${p.sector}${p.effluent ? ' with declared process effluent' : ''} prompts a pollution-consent applicability check. The actual requirement depends on activity, category and exemptions.`, guidance: 'Where applicable, CTE is required before establishment. Confirm classification and current document requirements with MPCB. Existing units should seek authority guidance; this demo is not retrospective permission.', source: sources.mpcb, docs: ['entity', 'site', 'process'], dependencies: [] });
    list.push({ id: 'cto', title: 'Consent to Operate', short: 'CTO', agency: 'Maharashtra Pollution Control Board', why: 'Operation of a consent-requiring unit prompts an operating-consent check after establishment and installation of pollution-control systems.', guidance: 'Where applicable, obtain CTO after establishment and installation of control systems, before commencing operations. This prototype uses approved CTE as a sequencing dependency; official conditions prevail.', source: sources.mpcb, docs: ['entity', 'site', 'process', 'controls'], dependencies: ['cte'], blocked: p.stage === 'Planning' });
  }
  list.push({ id: 'udyam', title: 'Udyam registration', short: 'MSME', agency: 'Ministry of MSME', why: 'Optional MSME registration discovery. Investment, turnover and other official criteria must be checked. Workforce alone does not establish eligibility.', guidance: 'Use the official portal to check eligibility and registration requirements. Udyam registration does not require renewal. The local example document is not the official portal checklist.', source: sources.udyam, docs: ['entity'], dependencies: [] });
  if (p.workforce >= 10) list.push({ id: 'workplace', title: 'Workplace compliance check', short: 'LABOUR', agency: 'Applicability discovery', why: `Your declared workforce of ${p.workforce} prompts an advisory check. The 10-person threshold is a demo triage rule, not a legal determination.`, guidance: 'Factory, labour and workplace obligations depend on activity, power usage, headcount and current law. Use NSWS Know Your Approvals and MAITRI for official routing. This guidance item cannot be submitted here.', source: sources.nsws, docs: [], dependencies: [], advisory: true });
  return list;
}

export function createState(project?: Project): State {
  const sample = !project;
  const p: Project = project || { name: 'Sahyadri Precision Works', sector: 'Manufacturing', district: 'Pune', stage: 'Planning', workforce: 28, effluent: true, caseId: 'US-2026-0142' };
  const needed = new Set([...requirements(p).flatMap(r => r.docs), ...canonicalRequiredDocuments(p)]);
  const labels = { entity: 'Enterprise identity', site: 'Site & layout plan', process: 'Process & effluent note', controls: 'Pollution-control systems record', 'fire-plan': 'Fire safety plan', 'boiler-record': 'Boiler / heater record', 'water-balance': 'Water balance and groundwater note', 'load-sanction': 'Electricity load sanction', 'hazard-inventory': 'Hazardous material inventory', 'emergency-plan': 'Emergency response plan' };
  return { version: 1, project: p, documents: Object.entries(labels).filter(([id]) => needed.has(id)).map(([id, name]) => ({ id, name, file: sample && id === 'entity' ? 'enterprise-profile.pdf' : sample && id === 'site' ? 'site-layout-v1.pdf' : '', size: sample && ['entity', 'site'].includes(id) ? 184320 : 0, declaredName: sample && id === 'site' ? 'Sahyadri Engineering Works' : p.name, checked: sample && ['entity', 'site'].includes(id) })), applications: Object.fromEntries(requirements(p).filter(r => !r.advisory).map(r => [r.id, { status: 'draft', messages: [] }])), sources: [], inspections: [], grievances: [], saved: [], activity: [{ id: 'initial', at: new Date().toISOString(), role: 'System', text: sample ? 'Sample workspace created. Illustrative document metadata loaded; no files uploaded.' : 'Project created. Indicative checklist generated from declared project details.' }] };
}

export function issues(d: Doc, p: Project): string[] {
  const result: string[] = [];
  if (!d.file) result.push('File metadata missing');
  if (d.file && !d.checked) result.push('Applicant review needed');
  if (d.file && d.declaredName.trim().toLowerCase() !== p.name.trim().toLowerCase()) result.push('Project name mismatch');
  return result;
}
export function blockers(s: State, r: Requirement): string[] {
  const result = r.docs.flatMap(id => {
    const d = s.documents.find(d => d.id === id);
    return !d || issues(d, s.project).length ? [`${d?.name || id}: ${d ? issues(d, s.project).join(', ').toLowerCase() : 'missing'}`] : [];
  });
  r.dependencies.forEach(id => { if (s.applications[id]?.status !== 'approved') result.push(`${id.toUpperCase()} must be approved in this demo`); });
  if (r.blocked) result.push('Confirm establishment and installed control systems before CTO');
  return result;
}
export function today(offset = 0): string {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dateLabel(value: string): string { return new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }

// Browser snapshots are untrusted; incomplete or incompatible workflows are not restored.
export function validState(value: unknown): value is State {
  if (!value || typeof value !== 'object') return false;
  const s = value as State, p = s.project;
  const str = (v: unknown) => typeof v === 'string';
  const date = (v: unknown) => str(v) && Number.isFinite(Date.parse(v as string));
  if (s.version !== 1 || !p || !str(p.name) || !p.name.trim() || !str(p.caseId) || !str(p.district) || !['Manufacturing', 'Food processing', 'Services'].includes(p.sector) || !['Planning', 'Established', 'Operating'].includes(p.stage) || !Number.isInteger(p.workforce) || p.workforce < 0 || typeof p.effluent !== 'boolean') return false;
  if (!Array.isArray(s.documents) || !s.documents.every(d => d && str(d.id) && str(d.name) && str(d.file) && Number.isFinite(d.size) && d.size >= 0 && str(d.declaredName) && typeof d.checked === 'boolean')) return false;
  if (s.applicantProfile && (!str(s.applicantProfile.fullName) || !s.applicantProfile.fullName.trim() || !str(s.applicantProfile.email) || !/^\S+@\S+\.\S+$/.test(s.applicantProfile.email) || !str(s.applicantProfile.phone) || !/^\+?[0-9 ()-]{7,20}$/.test(s.applicantProfile.phone) || !date(s.applicantProfile.completedAt))) return false;
   const requiredDocs = new Set([...requirements(p).flatMap(r => r.docs), ...canonicalRequiredDocuments(p)]);
  if (s.documents.length !== requiredDocs.size || new Set(s.documents.map(d => d.id)).size !== requiredDocs.size || !s.documents.every(d => requiredDocs.has(d.id))) return false;
  if (!s.applications || typeof s.applications !== 'object' || !requirements(p).filter(r => !r.advisory).every(r => { const a = s.applications[r.id]; return a && ['draft', 'submitted', 'query', 'approved'].includes(a.status) && Array.isArray(a.messages) && a.messages.every(m => m && ['Applicant', 'Department officer', 'Facilitation officer'].includes(m.role) && str(m.text) && date(m.at)) && (!a.approvedAt || date(a.approvedAt)) && (!a.reminder || /^\d{4}-\d{2}-\d{2}$/.test(a.reminder)); })) return false;
  if (!Array.isArray(s.inspections) || !s.inspections.every(i => i && str(i.id) && ['cte', 'cto'].includes(i.app) && /^\d{4}-\d{2}-\d{2}$/.test(i.date) && ['requested', 'confirmed', 'completed'].includes(i.status) && str(i.note))) return false;
  if (!Array.isArray(s.grievances) || !s.grievances.every(g => g && str(g.id) && str(g.subject) && str(g.text) && ['Open', 'In review', 'Resolved'].includes(g.status) && str(g.response) && date(g.at))) return false;
  return Array.isArray(s.sources) && s.sources.every(str) && Array.isArray(s.saved) && s.saved.every(str) && Array.isArray(s.activity) && s.activity.every(a => a && str(a.id) && date(a.at) && ['System', 'Applicant', 'Department officer', 'Facilitation officer'].includes(a.role) && str(a.text));
}
