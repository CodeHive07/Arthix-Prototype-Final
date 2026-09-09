import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Bot, Database, FileSearch, GitBranch, Save, ShieldCheck, UserRound } from 'lucide-react';
import type { Project, ApplicantProfile } from '../../lib/udyog';
import { requirements, syncDocuments } from '../../lib/udyog';
import { districts, profileLabels, profileOf, projectTypes, type ProjectProfile } from '../../lib/project-profile';
import { evaluateApplicability, projectDataIssues, projectToProjectData, requiredDocuments } from '../../lib/arthix-rules';
import type { Update, View } from './Workspace';

type Props = { project: Project; applicantProfile?: ApplicantProfile; update: Update; go: (view: View) => void };
const numeric = ['investmentCr', 'landArea', 'builtUpArea', 'workerCount', 'electricityLoadKw'] as const;
const toggles = ['wastewater', 'boiler', 'hazardous', 'groundwater', 'highVoltage', 'sensitiveArea'] as const;

export default function InformationView({ project, applicantProfile, update, go }: Props) {
  const labels = profileLabels.en;
  const [applicant, setApplicant] = useState({ fullName: applicantProfile?.fullName || '', email: applicantProfile?.email || '', phone: applicantProfile?.phone || '' });
  const [draft, setDraft] = useState<ProjectProfile>(() => ({ ...profileOf(project), workerCount: profileOf(project).workerCount ?? project.workforce, wastewater: profileOf(project).wastewater ?? project.effluent }));
  const [synced, setSynced] = useState(project);
  const [error, setError] = useState('');
  if (synced !== project) { setSynced(project); setDraft({ ...profileOf(project), workerCount: profileOf(project).workerCount ?? project.workforce, wastewater: profileOf(project).wastewater ?? project.effluent }); }
  const setApplicantField = (key: 'fullName' | 'email' | 'phone', value: string) => setApplicant(current => ({ ...current, [key]: value }));
  const set = (key: keyof ProjectProfile, value: string | number | boolean) => setDraft(current => ({ ...current, [key]: value }));
  const asProject = (profile: ProjectProfile): Project => ({ ...profile, workforce: profile.workerCount ?? profile.workforce, effluent: profile.wastewater ?? profile.effluent });

  // Live preview: the engines that will consume these exact facts once saved.
  const preview = useMemo(() => {
    const nextProject = asProject(draft);
    const projectData = projectToProjectData(nextProject);
    const applicability = evaluateApplicability(projectData);
    const applicable = applicability.filter(item => item.decision === 'potentially_applicable' || item.decision === 'needs_confirmation');
    const confirmation = applicable.filter(item => item.decision === 'needs_confirmation');
    const missingLabels: Record<string, string> = { investmentCr: labels.investmentCr, landAreaSqM: labels.landArea, electricityLoadKw: labels.electricityLoadKw, sensitiveArea: labels.sensitiveArea };
    const missing = [...new Set(confirmation.flatMap(item => item.missingFacts))].map(field => missingLabels[field] || field);
    const warnings = projectDataIssues(projectData);
    const before = new Set([...requirements(project).flatMap(item => item.docs), ...requiredDocuments(projectToProjectData(project))]);
    const after = new Set([...requirements(nextProject).flatMap(item => item.docs), ...requiredDocuments(projectData)]);
    const added = [...after].filter(id => !before.has(id));
    const removed = [...before].filter(id => !after.has(id));
    const completeness = applicable.length ? Math.round(((applicable.length - confirmation.length) / applicable.length) * 100) : 100;
    return { applicable, confirmation, missing, warnings, added, removed, completeness, documentCount: after.size };
  }, [draft, project, labels]);

  function save(target?: View) {
    const email = applicant.email.trim().toLowerCase();
    if (applicant.fullName.trim().length < 2) return setError('Enter the applicant full name.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    if (!/^\+?[0-9 ()-]{7,20}$/.test(applicant.phone.trim())) return setError('Enter a valid phone number.');
    setError('');
    update('Applicant and project information saved; engines re-evaluated from the declared facts.', current => {
      current.applicantProfile = { fullName: applicant.fullName.trim(), email, phone: applicant.phone.trim(), completedAt: current.applicantProfile?.completedAt || new Date().toISOString() };
      const next: Project = { ...current.project, ...draft, name: draft.name.trim() || current.project.name, workforce: draft.workerCount ?? current.project.workforce, effluent: draft.wastewater ?? current.project.effluent };
      current.project = next;
      current.documents = syncDocuments(next, current.documents);
    });
    if (target) go(target);
  }

  return <div className="uw-info-view">
    <div className="uw-info-strip"><UserRound size={18}/><span><strong>One source of truth.</strong> Applicant identity and project facts declared here feed the Rules Engine, Dynamic DAG, Pre-Validation and the Compliance Assistant. Save once and every engine re-evaluates.</span></div>
    <section className="uw-panel uw-info-hero"><div><span className="uw-eyebrow">STEP 01 / APPLICANT INFORMATION</span><h2>Who is applying.</h2><p>Identifies the workspace record and travels with every case action. You can update it any time.</p></div><span className="uw-info-badge"><UserRound size={16}/>{applicantProfile ? 'Profile on record' : 'Not yet declared'}</span></section>
    <section className="uw-panel"><div className="uw-profile-form"><label className="uw-field">Full name<input value={applicant.fullName} maxLength={100} placeholder="Your full name" onChange={event => setApplicantField('fullName', event.target.value)} /></label><label className="uw-field">Email address<input value={applicant.email} type="email" maxLength={160} placeholder="you@example.com" onChange={event => setApplicantField('email', event.target.value)} /></label><label className="uw-field">Phone number<input value={applicant.phone} inputMode="tel" maxLength={20} placeholder="+91 98765 43210" onChange={event => setApplicantField('phone', event.target.value)} /></label></div></section>
    <section className="uw-panel uw-info-hero"><div><span className="uw-eyebrow">STEP 02 / PROJECT INFORMATION</span><h2>What is being set up.</h2><p>These declarations drive indicative rule matching, the approval graph and the dossier checklist. Declare facts as completely as possible for high-confidence results.</p></div><span className="uw-info-badge"><Database size={16}/>{preview.documentCount} documents implied</span></section>
    <section className="uw-panel"><div className="uw-profile-form"><label className="uw-field">Enterprise name<input value={draft.name} maxLength={100} onChange={event => set('name', event.target.value)} /></label><label className="uw-field">{labels.projectType}<select value={draft.projectType || ''} onChange={event => set('projectType', event.target.value)}><option value="">Not declared</option>{projectTypes.map(type => <option key={type}>{type}</option>)}</select></label><label className="uw-field">{labels.stage}<select value={draft.stage} onChange={event => set('stage', event.target.value as Project['stage'])}><option>Planning</option><option>Established</option><option>Operating</option></select></label><label className="uw-field">{labels.district}<select value={draft.district} onChange={event => set('district', event.target.value)}>{districts.map(district => <option key={district}>{district}</option>)}</select></label>{numeric.map(key => <label className="uw-field" key={key}>{labels[key]}<input type="number" min="0" step="any" value={draft[key] ?? ''} onChange={event => set(key, event.target.value === '' ? 0 : Number(event.target.value))} /></label>)}</div><div className="uw-profile-toggles">{toggles.map(key => <label key={key}><input type="checkbox" checked={Boolean(draft[key])} onChange={event => set(key, event.target.checked)} />{labels[key]}</label>)}</div></section>
    <section className="uw-panel uw-info-hero"><div><span className="uw-eyebrow">STEP 03 / ENGINE FEED</span><h2>Where these facts go.</h2><p>Live preview computed from the form as you type. Saving refreshes every engine from the same source of truth.</p></div><span className="uw-info-badge"><ShieldCheck size={16}/>{preview.completeness}% rule confidence</span></section>
    <section className="uw-panel">
      <div className="uw-info-meter" role="img" aria-label={`Rule confidence ${preview.completeness}%`}><span style={{ width: `${preview.completeness}%` }} /></div>
      <div className="uw-rules-metrics">
        <div><span>RULES ENGINE</span><strong>{preview.applicable.length}</strong><small>applicable routes · {preview.confirmation.length} need confirmation</small></div>
        <div><span>DYNAMIC DAG</span><strong>{preview.applicable.length}</strong><small>orchestrated approval nodes</small></div>
        <div><span>PRE-VALIDATION</span><strong>{preview.documentCount}</strong><small>required documents generated</small></div>
        <div><span>COMPLIANCE ASSISTANT</span><strong>{draft.sector}</strong><small>{draft.district} · {draft.stage} grounding context</small></div>
      </div>
      {preview.missing.length > 0 && <div className="uw-info-note"><AlertTriangle size={14}/><span>Declare {preview.missing.join(', ')} to move {preview.confirmation.length} rule{preview.confirmation.length === 1 ? '' : 's'} from needs-confirmation to high-confidence applicability.</span></div>}
      {preview.warnings.length > 0 && <div className="uw-info-note uw-info-note-error"><AlertTriangle size={14}/><span>{preview.warnings.join(' ')}</span></div>}
      {(preview.added.length > 0 || preview.removed.length > 0) && <div className="uw-info-note"><FileSearch size={14}/><span>Saving will add {preview.added.length} and retire {preview.removed.length} required document{preview.added.length + preview.removed.length === 1 ? '' : 's'} in the dossier checklist. Uploaded files are preserved.</span></div>}
      {error && <p className="uw-form-error" role="alert">{error}</p>}
      <div className="uw-action-bar"><span className="uw-next-footnote"><ShieldCheck size={13} />Declarations are indicative; authorities make the final determination.</span><div className="uw-info-actions"><button className="uw-button" onClick={() => save()}><Save size={15}/>Save information</button><button className="uw-button uw-primary" onClick={() => save('Rules Engine')}>Save and open Rules Engine <ArrowRight size={15}/></button></div></div>
    </section>
    <div className="uw-info-flow">{[['Rules Engine', <GitBranch key="r" size={15}/>], ['Dynamic DAG', <GitBranch key="d" size={15}/>], ['Pre-Validation', <FileSearch key="p" size={15}/>], ['Compliance Assistant', <Bot key="c" size={15}/>]].map(([name, icon]) => <span key={String(name)}>{icon}{String(name)}</span>)}</div>
  </div>;
}
