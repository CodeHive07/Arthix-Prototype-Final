import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck, Clock3, Database, Factory, FileCheck2, FileText, FileSearch, GitBranch, LayoutDashboard, Leaf, LifeBuoy, MapPin, Menu, MessageCircle, Network, Plus, RotateCcw, ShieldCheck, Sparkles, UserRound, X } from 'lucide-react';
import { blockers, createState, dateLabel, issues, requirements, sources, validState, type Role, type State } from '../../lib/udyog';
import { CURRENT_ROLE } from '../../lib/access-scope';
import { progressFor } from '../../lib/engine-progress';
import { loadProjectState, saveProjectState } from '../../lib/project-storage';
import { analyzeArthixProject, convertProjectToProjectData, type Approval } from '../../lib/arthix-rules';
import { calculateOrchestration } from '../../lib/dag-engine';
import type { OrchestrationResult } from '../../lib/dag-engine';
import { IntelligencePanel, type IntelligenceState } from '../arthix/IntelligencePanel';
import RulesEngineView from './RulesEngineView';
import PreValidationView from './PreValidationView';
import RagAssistantView from './RagAssistantView';
import Views from './Views';
import ProjectDialog from './ProjectDialog';
import ProjectProfileView from './ProjectProfileView';
import CaseWorkflowView from './CaseWorkflowView';
import ApplicantOnboarding from './ApplicantOnboarding';
import InformationView from './InformationView';
import type { AssessmentSnapshot } from '../../lib/assessment';

const ArthixApprovalGraph = dynamic(() => import('../arthix/ArthixApprovalGraph').then(module => module.ArthixApprovalGraph), { ssr: false, loading: () => <div className="uw-panel uw-graph-loading">Preparing approval graph...</div> });
const DynamicDagView = dynamic(() => import('./DynamicDagView'), { ssr: false, loading: () => <div className="uw-panel uw-graph-loading">Preparing orchestration graph...</div> });

export const navigation = [
  { name: 'Rules Engine', icon: Database },
  { name: 'Dynamic DAG', icon: Network },
  { name: 'Pre-Validation', icon: FileSearch },
  { name: 'Compliance Assistant', icon: MessageCircle },
  { name: 'Government Support', icon: Leaf }, { name: 'Case Workflow', icon: ClipboardCheck }, { name: 'Help / Grievances', icon: LifeBuoy }, { name: 'Activity', icon: Activity }, { name: 'Applicant & Project Info', icon: UserRound },
] as const;
export type View = typeof navigation[number]['name'] | 'Overview' | 'Project Profile' | 'Approval Journey' | 'Applications' | 'Inspections' | 'Compliance' | 'Service Timelines';
export type Update = (text: string, change: (next: State) => void) => void;
const subtitles: Record<View, string> = {
  Overview: 'A clearer path from your next step to your next milestone.', 'Approval Journey': 'Understand what may apply, why it matters, and what comes next.',
  Applications: 'One place for submissions, queries and department decisions.',
  Inspections: 'Coordinate a site visit and keep its progress in view.', Compliance: 'Stay ahead of the obligations that follow an approval.',
  'Service Timelines': 'See elapsed time, current waits and review attention from recorded case activity.',
  'Project Profile': 'Declare the facts that shape indicative rules and document readiness.',
  'Rules Engine': 'Review rule versions, source health and project applicability.',
  'Pre-Validation': 'Extract evidence fields, resolve discrepancies and prepare a zero-defect dossier.',
  'Compliance Assistant': 'Ask grounded questions and inspect the sources behind every answer.',
  'Dynamic DAG': 'Coordinate concurrent approvals, dependencies and SLA escalation signals.',
  'Government Support': 'Discover official resources relevant to your enterprise.', 'Case Workflow': 'Record official handoffs, queries and decision conditions for the active case.', 'Help / Grievances': 'Get a project-linked concern into the right conversation.', Activity: 'A transparent record of this workspace, one action at a time.', 'Applicant & Project Info': 'Declare applicant identity and project facts once; every engine consumes the same source of truth.',
};
export function Badge({ status, children }: { status: string; children?: ReactNode }) {
  const labels: Record<string, string> = { draft: 'Not submitted', submitted: 'Under review', query: 'Action required', approved: 'Approved in system' };
  return <span className={`uw-badge uw-badge-${status.toLowerCase().replace(/ /g, '-')}`}>{children || labels[status] || status}</span>;
}
export function Source({ href, children }: { href: string; children: ReactNode }) { return <a className="uw-source" href={href} target="_blank" rel="noreferrer">{children}<ArrowUpRight size={13} /><span className="uw-sr-only"> (opens in a new tab)</span></a>; }
export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) { return <div className="uw-empty">{icon}<h3>{title}</h3><p>{children}</p></div>; }

export default function Workspace() {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [assessment, setAssessment] = useState<AssessmentSnapshot | null>(null);
  const [workflow, setWorkflow] = useState<{ dag: OrchestrationResult; dossierReady: boolean; timeSaved: { daysSaved: number; parallelismPercent: number } } | null>(null);
  const role: Role = CURRENT_ROLE;
  const [view, setView] = useState<View>('Rules Engine');
  const [mobile, setMobile] = useState(false);
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState('');
  const [modal, setModal] = useState<'project' | 'reset' | null>(null);
  const [selected, setSelected] = useState('cte');
  const queryHandled = useRef(false);
  const navToggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      let restored = createState();
      const stored = loadProjectState(validState);
      if (stored) restored = stored;
      else if (typeof window !== 'undefined' && window.localStorage.getItem('arthix:workspace.v2')) setNotice('Saved data was incompatible. A fresh sample workspace has been loaded.');
      try {
        const response = await fetch(`/api/cases?caseId=${encodeURIComponent(restored.project.caseId)}`);
        if (response.ok) {
          const remote = await response.json() as { state?: unknown };
          if (validState(remote.state)) restored = remote.state;
        }
      } catch { /* Local demo fallback remains available when the API is offline. */ }
      try {
        const response = await fetch('/api/assessment', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ project: convertProjectToProjectData(restored.project), prevalidation: restored.prevalidation }) });
        if (response.ok) setAssessment(await response.json() as AssessmentSnapshot);
      } catch { /* Browser-derived rules remain a temporary offline fallback. */ }
      if (!cancelled) setState(restored);
    };
    void restore();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!state) return;
    if (!saveProjectState(state)) queueMicrotask(() => setStorageError('Browser storage is unavailable or full. Changes are in memory only; export before leaving.'));
    void fetch('/api/cases', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ caseId: state.project.caseId, state }) }).catch(() => undefined);
  }, [state]);
  useEffect(() => {
    if (!state) return;
    const refreshAssessment = async () => {
      try {
        const response = await fetch('/api/assessment', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ project: convertProjectToProjectData(state.project), prevalidation: state.prevalidation }) });
        if (response.ok) setAssessment(await response.json() as AssessmentSnapshot);
      } catch { /* Keep the last canonical assessment while offline. */ }
    };
    void refreshAssessment();
  }, [state]);
  useEffect(() => {
    if (!state) return;
    const refreshWorkflow = async () => {
      try {
        const response = await fetch('/api/workflow', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ project: convertProjectToProjectData(state.project), documents: state.documents, prevalidation: state.prevalidation, statuses: Object.fromEntries(Object.entries(state.applications).map(([id, application]) => [id, application.status])) , slaStartedAt: state.slaStartedAt }) });
        if (response.ok) setWorkflow(await response.json());
      } catch { /* Keep the last workflow snapshot while offline. */ }
    };
    void refreshWorkflow();
  }, [state]);
  useEffect(() => {
    if (!router.isReady || !state || queryHandled.current) return;
    queryHandled.current = true;
    const isNew = router.query.new, isDemo = router.query.demo;
    queueMicrotask(() => {
      if (isNew === '1') setModal('project');
      else if (isDemo === '1') setNotice('Local demo loaded. Existing progress is preserved; use Reset demo for a fresh sample.');
    });
  }, [router.isReady, router.query.new, router.query.demo, state]);
  useEffect(() => {
    if (!mobile) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMobile(false); navToggle.current?.focus(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [mobile]);

  function go(next: View) { setView(next); setMobile(false); }
  const update: Update = (text, change) => {
    setState(previous => {
      if (!previous) return previous;
      const next: State = JSON.parse(JSON.stringify(previous));
      change(next);
      next.activity.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), role, text });
      return next;
    });
    setNotice(text);
  };
  function completeApplicantOnboarding(profile: State['applicantProfile']) {
    if (!profile) return;
    update('Applicant profile completed.', current => { current.applicantProfile = profile; });
  }
  function exportStatus() {
    if (!state) return;
    const snapshot = { exportedAt: new Date().toISOString(), disclaimer: 'Arthix workspace record. This export is not a government approval, legal opinion, eligibility assessment or official record. Files are metadata only.', ...state, checklist: requirements(state.project).map(r => ({ ...r, readinessBlockers: blockers(state, r), sourceReviewedByUser: state.sources.includes(r.id) })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${state.project.caseId}-status.json`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('JSON status exported. Includes project details and local messages, but no file contents.');
  }

  if (!state) return <div className="uw-root uw-loading"><div className="uw-brand-mark"><GitBranch size={25} /></div><h1>Arthix</h1><p>Preparing your project workspace...</p></div>;
  const checklist = requirements(state.project);
  const apps = checklist.filter(r => !r.advisory);
  const ready = state.documents.filter(d => !issues(d, state.project).length).length;
  const approved = apps.filter(r => state.applications[r.id].status === 'approved').length;
  const queries = apps.filter(r => state.applications[r.id].status === 'query').length;
  const next = apps.find(r => state.applications[r.id].status !== 'approved');
  const pending = next ? blockers(state, next) : [];
  const analysis = analyzeArthixProject(convertProjectToProjectData(state.project));
   const approvalIdForRequirement = (approval: Approval) => ({ 'mpcb-cte': 'cte', 'factory-plan': 'workplace', 'building-approval': 'cte', 'provisional-fire-safety': 'cte', 'electricity-connection': 'cte' }[approval.id] || approval.id);
   const canonicalApprovals = assessment?.approvals || analysis.approvals;
   const graphStatuses = Object.fromEntries(canonicalApprovals.map(approval => [approval.id, state.applications[approvalIdForRequirement(approval)]?.status || approval.status]));
   const dag = workflow?.dag || calculateOrchestration({ project: convertProjectToProjectData(state.project), approvalOverride: canonicalApprovals, statuses: Object.fromEntries(canonicalApprovals.map(approval => [approval.id, state.applications[approvalIdForRequirement(approval)]?.status || 'draft'])), prevalidation: state.prevalidation, slaStartedAt: state.slaStartedAt });
  const updateIntelligence = (nextState: IntelligenceState) => update('Arthix intelligence review updated.', current => { current.extractedEntities = Object.fromEntries(Object.entries(nextState.extractedEntities || {}).map(([key, value]) => [key, typeof value === 'object' && value !== null && 'value' in value ? value.value : value])); current.validationDiscrepancies = nextState.validationDiscrepancies; });
  const openApp = (id: string) => { setSelected(id); go('Applications'); };
  const navItem = ({ name, icon: Icon }: typeof navigation[number]) => <button key={name} className={`uw-nav-item ${view === name ? 'is-active' : ''}`} aria-current={view === name ? 'page' : undefined} onClick={() => go(name)}><Icon size={18} strokeWidth={1.7} /><span>{name}</span></button>;

  return <div className="uw-root">
    <a className="uw-skip" href="#workspace-main">Skip to workspace content</a>
    {mobile && <button className="uw-sidebar-backdrop" aria-label="Close navigation" onClick={() => { setMobile(false); navToggle.current?.focus(); }} />}
    <aside id="workspace-navigation" className={`uw-sidebar ${mobile ? 'is-open' : ''}`}>
      <Link href="/" className="uw-brand"><span className="uw-brand-mark"><GitBranch size={24} strokeWidth={1.8} /></span><span>Arthix<small>INDUSTRY, CONNECTED.</small></span></Link>
      <div className="uw-workspace-label"><span className="uw-eyebrow">PROJECT WORKSPACE</span><span className="uw-tiny-dot" /></div>
       <button className="uw-project-switch" onClick={() => go('Project Profile')}><span className="uw-project-icon"><Factory size={18} /></span><span><strong>{state.project.name}</strong><small>{state.project.district}, Maharashtra · edit profile</small></span><ChevronDown size={14} /></button>
      <nav aria-label="Workspace navigation"><span className="uw-nav-label">ENGINE LAYER</span>{navigation.slice(0, 4).map(navItem)}<span className="uw-nav-label uw-nav-label-second">RESOURCES & SUPPORT</span>{navigation.slice(4).map(navItem)}</nav>
      <div className="uw-sidebar-bottom"><div className="uw-help-note"><CircleHelp size={20} /><strong>A little guidance goes a long way.</strong><p>Find the right official starting point for your enterprise.</p><button onClick={() => go('Help / Grievances')}>Visit the help desk <ArrowUpRight size={14} /></button></div><div className="uw-sidebar-footer"><span className="uw-avatar">SP</span><span><strong>Project team</strong><small>Local enterprise platform workspace</small></span><span className="uw-online-dot" /></div></div>
    </aside>
    <div className="uw-body">
      <header className="uw-topbar"><div className="uw-breadcrumb"><button ref={navToggle} className="uw-icon-button uw-mobile-toggle" aria-label={mobile ? 'Close navigation' : 'Open navigation'} aria-expanded={mobile} aria-controls="workspace-navigation" onClick={() => setMobile(!mobile)}>{mobile ? <X size={21} /> : <Menu size={21} />}</button><span>Maharashtra</span><ChevronRight size={13} /><strong>Industry workspace</strong></div><div className="uw-topbar-right"><span className="uw-demo-pill"><span />APPLICANT WORKSPACE</span><button className="uw-icon-button uw-notification" aria-label="View activity and updates" onClick={() => go('Activity')}><Bell size={19} /><i /></button></div></header>
      <main id="workspace-main" className="uw-main" tabIndex={-1}>
        <div className="uw-page-heading"><div><div className="uw-eyebrow uw-case"><span className="uw-tiny-dot" />YOUR ENTERPRISE. ONE CONNECTED JOURNEY.<span className="uw-case-id">{state.project.caseId}</span></div><h1>{view === 'Overview' ? "Let's move your project forward." : view}</h1><p>{subtitles[view]}</p></div><button className="uw-button uw-export" onClick={exportStatus}><ArrowDownToLine size={16} />Export status</button></div>
        {storageError && <div className="uw-storage-alert" role="alert">{storageError}</div>}
         {notice && <div className="uw-notice" role="status"><CheckCircle2 size={16} /><span>{notice}</span><button className="uw-icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={15} /></button></div>}
          {!state.applicantProfile && <ApplicantOnboarding onComplete={completeApplicantOnboarding} />}
          {view === 'Case Workflow' ? <CaseWorkflowView state={state} role={role} update={update} go={go} /> : view === 'Dynamic DAG' ? <DynamicDagView project={state.project} projectData={convertProjectToProjectData(state.project)} assessment={assessment} approvals={assessment?.approvals || analysis.approvals} statuses={graphStatuses} dag={dag} onAskWhy={context => { setNotice(context); go('Compliance Assistant'); }} onImpactAcknowledged={(amendmentId, requiresRevalidation) => update(`${amendmentId}: change impact acknowledged.`, current => { current.impactAcknowledgements = [...(current.impactAcknowledgements || []), { amendmentId, acknowledgedAt: new Date().toISOString(), actor: role, revalidationRequired: requiresRevalidation }]; })} onSelect={approval => { const target = approvalIdForRequirement(approval); setSelected(checklist.some(item => item.id === target) ? target : checklist[0]?.id || 'cte'); go('Applications'); }} onStart={id => update(`${id.toUpperCase()}: orchestration route started.`, current => { current.slaStartedAt = { ...(current.slaStartedAt || {}), [id]: new Date().toISOString() }; current.engineProgress = { ...progressFor(current), dagCompleted: true }; })} /> : view === 'Compliance Assistant' ? <RagAssistantView project={state.project} initialQuery={''} /> : view === 'Pre-Validation' ? <PreValidationView project={state.project} assessment={assessment} documents={state.documents} value={state.prevalidation} onChange={value => update('Pre-validation dossier updated.', current => { current.prevalidation = value; if (value.dossierStatus === 'ready') current.engineProgress = { ...progressFor(current), prevalidationCompleted: true }; })} onDocumentChange={(id, change, message) => update(message, current => { const document = current.documents.find(item => item.id === id); if (document) change(document); })} /> : view === 'Rules Engine' ? <RulesEngineView project={state.project} assessment={assessment} /> : view === 'Applicant & Project Info' ? <InformationView project={state.project} applicantProfile={state.applicantProfile} update={update} go={go} /> : view === 'Overview' ? <>
               <div className="uw-arthix-overview"><ProjectProfileView project={state.project} documents={state.documents} verifiedSources={state.sources} onChange={change => update('Project profile updated.', current => change(current.project))} /><ArthixApprovalGraph approvals={canonicalApprovals} statuses={graphStatuses} dag={dag} onAskWhy={context => { setNotice(context); go('Compliance Assistant'); }} onSelect={approval => { const target = approvalIdForRequirement(approval); setSelected(checklist.some(item => item.id === target) ? target : checklist[0]?.id || 'cte'); go('Approval Journey'); }} /><div className="uw-arthix-columns"><IntelligencePanel state={{ ...state, versionSummary: analysis.versionSummary } as IntelligenceState} onChange={updateIntelligence} /></div></div>
           <section className="uw-project-banner"><div className="uw-project-banner-icon"><Factory size={28} strokeWidth={1.5} /></div><div className="uw-project-summary"><span className="uw-eyebrow">YOUR ACTIVE PROJECT</span><h2>{state.project.name}</h2><div className="uw-project-meta"><span><MapPin size={13} />{state.project.district}, Maharashtra</span><span>{state.project.sector}</span><span>{state.project.workforce} team members</span></div></div><div className="uw-project-stage"><Badge status="planning">{state.project.stage} stage</Badge><button className="uw-text-button" onClick={() => setModal('project')}><Plus size={13} />New project</button></div></section>
           <section className="uw-stats" aria-label="Project status"><div><span className="uw-eyebrow">APPROVAL PROGRESS</span><div className="uw-stat-value">{approved}<span>/ {apps.length}</span><span className="uw-stat-icon"><GitBranch size={20} /></span></div><p>Simulated approvals recorded</p><div className="uw-meter"><span style={{ width: `${approved / apps.length * 100}%` }} /></div></div><div><span className="uw-eyebrow">DOSSIER READINESS</span><div className="uw-stat-value">{ready}<span>/ {state.documents.length}</span><span className="uw-stat-icon"><FileCheck2 size={20} /></span></div><p>Open Pre-Validation to review</p><button className="uw-text-button" onClick={() => go('Pre-Validation')}>Review dossier <ArrowRight size={12} /></button></div><div><span className="uw-eyebrow">NEEDS YOUR ATTENTION</span><div className="uw-stat-value uw-amber-text">{state.documents.length - ready + queries}<span className="uw-stat-icon"><Bell size={20} /></span></div><p>Dossier checks & open queries</p><button className="uw-text-button" onClick={() => go(queries ? 'Applications' : 'Pre-Validation')}>See action items <ArrowRight size={12} /></button></div><div><span className="uw-eyebrow">NEXT MILESTONE</span><div className="uw-stat-milestone">{next?.title || 'Post-approval care'}<ArrowUpRight size={18} /></div><p>{next?.id === 'udyam' ? 'Optional registration discovery' : next ? 'MPCB / indicative sequence' : 'Review your compliance reminders'}</p><span className="uw-small-label">PREPARE AT YOUR PACE</span></div></section>
          <div className="uw-overview-columns"><div className="uw-overview-primary">
             <section className="uw-panel uw-next-step"><div className="uw-next-step-top"><span className="uw-eyebrow"><Sparkles size={13} />YOUR NEXT BEST STEP</span><Badge status="indicative">Rule-based guidance</Badge></div><h2>{queries ? 'A department query needs your response.' : pending.length ? 'A little preparation. A smoother next step.' : next ? `You're ready to progress ${next.short}.` : 'Your demo approvals are in place.'}</h2><p>{queries ? 'Review the officer conversation, make any corrections, and send a response.' : pending.length ? `Start with ${next?.title}. Resolve the checklist below before simulating a submission.` : 'Continue the local workflow. Official requirements and decisions remain with the relevant authority.'}</p>{pending.length > 0 && <div className="uw-next-items">{pending.slice(0, 2).map((item, i) => <div key={item}><span>{String(i + 1).padStart(2, '0')}</span>{item}<ChevronRight size={15} /></div>)}</div>}<button className="uw-button uw-primary" onClick={() => { if (queries) openApp(apps.find(r => state.applications[r.id].status === 'query')!.id); else if (pending.length) go(pending.some(i => i.includes('establishment') || i.includes('must be approved')) ? 'Approval Journey' : 'Pre-Validation'); else if (next) openApp(next.id); else go('Compliance'); }}>{queries ? 'Respond to query' : pending.length ? 'Review next steps' : next ? 'Open application' : 'Review compliance'}<ArrowRight size={16} /></button><span className="uw-next-footnote"><ShieldCheck size={12} />Nothing is submitted to a government portal.</span></section>
            <section className="uw-panel"><div className="uw-section-heading"><div><span className="uw-eyebrow">FROM INTENT TO OPERATION</span><h2>Your approval journey</h2></div><button className="uw-text-button" onClick={() => go('Approval Journey')}>View journey <ArrowUpRight size={14} /></button></div><div className="uw-journey-list">{checklist.map((r, i) => <button key={r.id} className="uw-journey-row" onClick={() => { setSelected(r.id); go('Approval Journey'); }}><span className={`uw-journey-node ${state.applications[r.id]?.status === 'approved' ? 'is-complete' : ''}`}>{state.applications[r.id]?.status === 'approved' ? <Check size={16} /> : String(i + 1).padStart(2, '0')}</span><span className="uw-journey-name"><strong>{r.title}</strong><small>{r.advisory ? 'Advisory check, not an application' : r.id === 'udyam' ? 'Optional / no renewal' : r.dependencies.length ? 'After CTE & establishment' : 'Before establishment, where applicable'}</small></span><Badge status={r.advisory ? 'guidance' : state.applications[r.id].status} /><ChevronRight size={15} /></button>)}</div><div className="uw-panel-footnote"><GitBranch size={14} />Based on your sector, stage, workforce and effluent declaration.</div></section>
          </div><div className="uw-overview-secondary">
            <section className="uw-advisory"><div className="uw-advisory-title"><span className="uw-advisory-icon"><ShieldCheck size={21} /></span><span className="uw-eyebrow">CLARITY, NOT GUESSWORK</span></div><h2>Know what applies.<br />Know where to verify.</h2><p>{state.project.effluent ? 'Process effluent is declared for your project. Confirm your pollution category and control requirements with MPCB.' : 'Requirements vary by activity and location. Check the official applicability route before making commitments.'}</p><Source href={state.project.effluent ? sources.mpcb : sources.nsws}>{state.project.effluent ? 'Read MPCB guidance' : 'Explore Know Your Approvals'}</Source><div className="uw-advisory-note">Advisory only. No AI verification, risk scoring or automatic approval decisions.</div></section>
            <section className="uw-panel uw-recent"><div className="uw-section-heading"><h2>Recent activity</h2><Activity size={17} /></div><div className="uw-mini-timeline">{state.activity.slice(0, 3).map(item => <div key={item.id}><span className="uw-timeline-dot" /><time>{dateLabel(item.at)}</time><p>{item.text}</p><small>{item.role}</small></div>)}</div><button className="uw-text-button" onClick={() => go('Activity')}>View all activity <ArrowRight size={13} /></button></section>
            <button className="uw-support-link" onClick={() => go('Government Support')}><Leaf size={24} /><span><strong>Support for your next chapter</strong><small>Explore official scheme discovery</small></span><ArrowUpRight size={18} /></button>
          </div></div>
        </> : <Views key={`${state.project.caseId}-${view}`} state={state} role={role} view={view} selected={selected} setSelected={setSelected} update={update} go={go} notify={setNotice} />}
          <footer className="uw-footer"><div><span className="uw-footer-brand">Arthix</span><span>Maharashtra industrial approvals workspace</span><small>Guidance supports preparation; responsible authorities retain statutory decisions.</small></div><button className="uw-text-button" onClick={() => setModal('reset')}><RotateCcw size={13} />Reset workspace</button></footer>
      </main>
    </div>
    {modal && <ProjectDialog mode={modal} role={role} close={() => setModal(null)} exportStatus={exportStatus} replace={nextState => { setState(nextState); setSelected(requirements(nextState.project)[0].id); setModal(null); go('Overview'); setNotice(modal === 'reset' ? 'System reset. A fresh sample workspace is ready.' : 'Project created. Your official checklist reflects your declared details.'); void router.replace('/dashboard', undefined, { shallow: true }); }} />}
  </div>;
}






