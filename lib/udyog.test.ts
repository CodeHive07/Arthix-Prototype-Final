import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ServiceViews, { serviceTimeline } from '../components/workspace/ServiceViews';
import { navigation } from '../components/workspace/Workspace';
import type { Application, Role } from './udyog';
import { blockers, createState, issues, requirements, today, validState } from './udyog';

test('sample project has conditional consent, independent registration and workplace guidance', () => {
  const s = createState();
  assert.equal(s.project.caseId, 'US-2026-0142');
  assert.deepEqual(requirements(s.project).map(r => r.id), ['cte', 'cto', 'udyam', 'workplace']);
  assert.equal(s.documents.filter(d => !issues(d, s.project).length).length, 1);
  assert.ok(issues(s.documents.find(d => d.id === 'site')!, s.project).includes('Project name mismatch'));
});

test('services without effluent and a small workforce receive a smaller checklist', () => {
  const s = createState({ ...createState().project, sector: 'Services', workforce: 4, effluent: false });
  assert.deepEqual(requirements(s.project).map(r => r.id), ['udyam']);
  assert.deepEqual(s.documents.map(d => d.id), ['entity']);
  assert.deepEqual(Object.keys(s.applications), ['udyam']);
  assert.equal(s.documents[0].file, '');
});

test('effluent and workforce independently add consent and advisory checks', () => {
  const p = { ...createState().project, sector: 'Services' as const, workforce: 4, effluent: true };
  assert.deepEqual(requirements(p).map(r => r.id), ['cte', 'cto', 'udyam']);
  assert.deepEqual(requirements({ ...p, effluent: false, workforce: 10 }).map(r => r.id), ['udyam', 'workplace']);
});

test('readiness requires metadata, applicant review and a consistent name, but not source acknowledgement', () => {
  const s = createState(), r = requirements(s.project)[0];
  assert.ok(blockers(s, r).length > 0);
  s.documents.forEach(d => { d.file = 'demo.pdf'; d.size = 50; d.declaredName = s.project.name; d.checked = true; });
  assert.deepEqual(s.sources, []);
  assert.deepEqual(blockers(s, r), []);
  s.documents[0].checked = false;
  assert.ok(blockers(s, r).some(b => b.includes('review')));
  s.documents[0].checked = true;
  s.documents[0].declaredName = 'Another enterprise';
  assert.ok(blockers(s, r).some(b => b.includes('mismatch')));
});

test('CTO remains blocked until CTE approval and establishment, even with ready documents', () => {
  const s = createState();
  s.documents.forEach(d => { d.file = 'demo.pdf'; d.checked = true; d.declaredName = s.project.name; });
  let cto = requirements(s.project).find(r => r.id === 'cto')!;
  assert.equal(blockers(s, cto).length, 2);
  s.applications.cte.status = 'approved';
  assert.equal(blockers(s, cto).length, 1);
  s.project.stage = 'Established';
  cto = requirements(s.project).find(r => r.id === 'cto')!;
  assert.deepEqual(blockers(s, cto), []);
});

test('Udyam is independent, optional guidance and explicitly has no renewal', () => {
  const s = createState(), r = requirements(s.project).find(r => r.id === 'udyam')!;
  assert.deepEqual(r.dependencies, []);
  assert.match(r.guidance, /does not require renewal/);
  assert.deepEqual(blockers(s, r), []);
});

test('valid snapshots restore and incomplete or malformed snapshots are rejected', () => {
  assert.equal(validState(JSON.parse(JSON.stringify(createState()))), true);
  for (const value of [null, {}, [], { version: 2 }, { ...createState(), documents: [] }, { ...createState(), documents: [null] }, { ...createState(), applications: {} }, { ...createState(), activity: [{ id: 'x', at: 'bad' }] }]) assert.equal(validState(value), false);
});

test('date helpers produce a future local ISO calendar date', () => {
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(today(1) > today());
});

test('service timelines keep first submission through query and response without pausing', () => {
  const app: Application = { status: 'submitted', messages: [{ role: 'Applicant', text: 'Submitted for local demo review', at: '2026-09-01T12:00:00Z' }] };
  const now = Date.parse('2026-09-09T12:00:00Z');
  assert.equal(serviceTimeline(app, now, 7).overTarget, true);
  app.status = 'query';
  app.messages.push({ role: 'Department officer', text: 'Clarify the site', at: '2026-09-07T12:00:00Z' });
  let timeline = serviceTimeline(app, now, 7);
  assert.equal(timeline.waitingFor, 'Applicant');
  assert.equal(timeline.waitingDays, 2);
  assert.equal(timeline.elapsedDays, 8);
  assert.equal(timeline.overTarget, true);
  app.status = 'submitted';
  app.messages.push({ role: 'Applicant', text: 'Site clarified', at: '2026-09-08T12:00:00Z' });
  timeline = serviceTimeline(app, now, 8);
  assert.equal(timeline.submittedAt, '2026-09-01T12:00:00Z');
  assert.equal(timeline.stageSince, '2026-09-08T12:00:00Z');
  assert.equal(timeline.waitingFor, 'Department');
  assert.equal(timeline.waitingDays, 1);
  assert.equal(timeline.elapsedDays, 8);
  assert.equal(timeline.overTarget, false);
  assert.equal(serviceTimeline(app, now + 1, 8).overTarget, true);
});

test('approval turnaround ends at the recorded decision message, not today', () => {
  const app: Application = { status: 'approved', messages: [
    { role: 'Applicant', text: 'Submitted for local demo review', at: '2026-09-01T12:00:00Z' },
    { role: 'Department officer', text: 'Approved in demo only', at: '2026-09-03T12:00:00Z' },
  ] };
  const before = JSON.stringify(app);
  const timeline = serviceTimeline(app, Date.parse('2026-10-01T12:00:00Z'), 7);
  assert.equal(timeline.turnaroundDays, 2);
  assert.equal(timeline.elapsedDays, 2);
  assert.equal(timeline.waitingFor, null);
  assert.equal(timeline.waitingDays, null);
  assert.equal(timeline.overTarget, false);
  assert.equal(JSON.stringify(app), before);
});

test('drafts, missing history, future timestamps and invalid targets do not invent metrics', () => {
  const now = Date.parse('2026-09-09T12:00:00Z');
  for (const status of ['draft', 'submitted', 'query', 'approved'] as const) {
    const timeline = serviceTimeline({ status, messages: [] }, now, 7);
    assert.equal(timeline.elapsedDays, null);
    assert.equal(timeline.overTarget, null);
  }
  const app: Application = { status: 'submitted', messages: [{ role: 'Applicant', text: 'Submitted', at: '2026-09-10T12:00:00Z' }] };
  assert.equal(serviceTimeline(app, now, 7).elapsedDays, null);
  app.messages[0].at = '2026-09-01T12:00:00Z';
  for (const target of [NaN, 0, -1, 1.5]) assert.equal(serviceTimeline(app, now, target).overTarget, null);
});

test('timeline navigation and role views preserve the local project without workflow actions', () => {
  assert.ok(navigation.slice(0, 4).some(item => item.name === 'Pre-Validation'));
  assert.equal(navigation[4].name, 'Government Support');
  const state = createState(), before = JSON.stringify(state);
  const noChange = () => { assert.fail('Timeline rendering must not mutate the workspace'); };
  for (const role of ['Applicant', 'Department officer', 'Facilitation officer'] as Role[]) {
    const html = renderToStaticMarkup(createElement(ServiceViews, { state, role, view: 'Service Timelines', selected: 'cte', setSelected: noChange, go: noChange, update: noChange, notify: noChange }));
    assert.match(html, role === 'Applicant' ? /Your case timelines/ : /Department &amp; facilitation overview/);
    assert.equal(html.includes('Department waiting overview for this project'), role !== 'Applicant');
    assert.match(html, /No submissions recorded yet/);
    assert.match(html, /not a statutory SLA/);
    assert.doesNotMatch(html, /Simulate submission|Raise query|Approve in demo|Reset demo/);
  }
  assert.equal(JSON.stringify(state), before);
});
