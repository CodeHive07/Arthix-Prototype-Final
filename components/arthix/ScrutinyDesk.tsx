'use client';

import { AlertCircle, CheckCircle2, Clock3, MessageSquare, ShieldCheck, TimerReset } from 'lucide-react';
import { useState } from 'react';
import type { State } from '../../lib/udyog';

export type ScrutinyAction = { type: 'query' | 'accept' | 'select'; applicationId: string; message?: string };
export type ScrutinyDeskProps = { state: State; onAction: (action: ScrutinyAction) => void };

function ageLabel(date?: string) { if (!date) return 'Clock not started'; const hours = Math.max(0, Math.round((Date.now() - Date.parse(date)) / 3600000)); return `${Math.floor(hours / 24)}d ${hours % 24}h elapsed`; }

export function ScrutinyDesk({ state, onAction }: ScrutinyDeskProps) {
  const queue = Object.entries(state.applications).filter(([, application]) => application.status !== 'draft');
  const [selectedId, setSelectedId] = useState(queue[0]?.[0]);
  const selected = queue.find(([id]) => id === selectedId) || queue[0];
  const openQueries = queue.filter(([, application]) => application.status === 'query').length;
  const ready = queue.filter(([, application]) => application.status === 'submitted').length;
  const select = (id: string) => { setSelectedId(id); onAction({ type: 'select', applicationId: id }); };
  return <section className="ax-panel ax-scrutiny" aria-labelledby="ax-scrutiny-title">
    <div className="ax-panel-heading"><div><span className="ax-kicker">OFFICER CONSOLE</span><h2 id="ax-scrutiny-title">Scrutiny desk</h2><p>Prioritise complete dossiers without losing department context.</p></div><span className="ax-status-chip ax-status-green"><i /> Officer view</span></div>
    <div className="ax-readiness"><div><ShieldCheck size={18} /><span><strong>Zero-defect readiness</strong><small>{ready} dossier{ready === 1 ? '' : 's'} ready for decision review</small></span></div><strong className="ax-readiness-score">{queue.length ? Math.round((ready / queue.length) * 100) : 100}%</strong></div>
    <div className="ax-sla-strip"><TimerReset size={16} /><span><strong>SLA monitor</strong><small>Escalate queues approaching the 7-day review target.</small></span><b>01d 18h</b></div>
    <div className="ax-desk-grid"><div className="ax-queue"><div className="ax-subheading"><h3>Review queue</h3><span>{queue.length} dossiers</span></div><div className="ax-table-wrap"><table><caption className="ax-sr-only">Officer review queue</caption><thead><tr><th>Dossier</th><th>Department</th><th>Age</th><th>Status</th></tr></thead><tbody>{queue.length ? queue.map(([id, application]) => <tr key={id} className={id === selected?.[0] ? 'ax-row-selected' : ''} onClick={() => select(id)}><td><button type="button" onClick={() => select(id)}>{id.toUpperCase()}</button><small>Case-linked application</small></td><td>{id === 'cte' ? 'MPCB' : id === 'cto' ? 'MPCB' : 'Power / Fire'}</td><td>{ageLabel(application.messages[0]?.at)}</td><td><span className={`ax-pill ax-pill-${application.status === 'query' ? 'warm' : application.status === 'approved' ? 'green' : 'blue'}`}>{application.status}</span></td></tr>) : <tr><td colSpan={4} className="ax-empty">No submitted dossiers in the queue.</td></tr>}</tbody></table></div></div>
      <aside className="ax-dossier" aria-label="Selected dossier detail"><div className="ax-subheading"><h3>Selected dossier</h3><span>{selected ? selected[0].toUpperCase() : 'NONE'}</span></div>{selected ? <><div className="ax-dossier-title"><div className="ax-dossier-mark"><CheckCircle2 size={18} /></div><div><strong>{selected[0].toUpperCase()} application</strong><small>Applicant response and evidence bundle</small></div></div><div className="ax-detail-list"><span><Clock3 size={14} />{ageLabel(selected[1].messages[0]?.at)}</span><span><AlertCircle size={14} />{openQueries ? `${openQueries} query open` : 'No open query'}</span><span><MessageSquare size={14} />{selected[1].messages.length} timeline events</span></div><p className="ax-detail-note">Check declared premises, supporting evidence and dependency status before recording a decision.</p><div className="ax-action-row"><button type="button" className="ax-button ax-button-light" onClick={() => onAction({ type: 'query', applicationId: selected[0], message: 'Please clarify the premises evidence and declared load.' })}><MessageSquare size={14} /> Query applicant</button><button type="button" className="ax-button ax-button-primary" onClick={() => onAction({ type: 'accept', applicationId: selected[0] })}>Accept in system <CheckCircle2 size={14} /></button></div></> : <p className="ax-empty">Select a dossier to inspect its evidence trail.</p>}</aside></div>
    <p className="ax-disclaimer"><ShieldCheck size={13} /> Simulation controls record local workflow events only. They do not issue an approval or alter an authority's decision.</p>
  </section>;
}
