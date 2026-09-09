import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeArthixProject, dependencyGraph, evaluateApplicability, projectDataIssues, projectToProjectData } from './arthix-rules';
import { analyzeWithRulesEngine, RULES_ENGINE_VERSION } from './rules-engine';

const manufacturing: Parameters<typeof analyzeArthixProject>[0] = { name: 'Apex Works', sector: 'Manufacturing', district: 'Pune', stage: 'Planning', workforce: 25, effluent: true, caseId: 'MH-001', investmentCr: 2, landAreaSqM: 5000, electricityLoadKw: 400, sensitiveArea: false };

test('missing facts are only reported for rules that actually apply', () => {
  const services = { ...manufacturing, sector: 'Services' as const, effluent: false, investmentCr: undefined };
  const result = evaluateApplicability(services).find(item => item.ruleId === 'mpcb-cte')!;
  assert.equal(result.decision, 'not_applicable');
  assert.deepEqual(result.missingFacts, []);
  assert.deepEqual(result.triggerFacts, []);
  const withoutInvestment = { ...manufacturing, investmentCr: undefined };
  const manufacturingResult = evaluateApplicability(withoutInvestment).find(item => item.ruleId === 'mpcb-cte')!;
  assert.equal(manufacturingResult.decision, 'needs_confirmation');
  assert.ok(manufacturingResult.missingFacts.includes('investmentCr'));
});

test('trigger facts cite the specific declared fact that switched a rule on', () => {
  const boiler = evaluateApplicability({ ...manufacturing, boiler: true }).find(item => item.ruleId === 'boiler')!;
  assert.equal(boiler.decision, 'potentially_applicable');
  const trigger = boiler.triggerFacts.find(item => item.field === 'boiler');
  assert.ok(trigger?.explanation.includes('boiler or thermic fluid heater is declared'));
  const cte = evaluateApplicability(manufacturing).find(item => item.ruleId === 'mpcb-cte')!;
  const effluent = cte.triggerFacts.find(item => item.field === 'effluent');
  assert.ok(effluent?.explanation.includes('Process effluent is declared'));
});

test('applicable rules flag unsatisfiable dependencies instead of leaving blockers empty', () => {
  const foodWithBoiler = { ...manufacturing, sector: 'Food processing' as const, boiler: true };
  const boiler = evaluateApplicability(foodWithBoiler).find(item => item.ruleId === 'boiler')!;
  assert.ok(boiler.blockers.some(message => message.includes('Factory plan approval') && message.includes('cannot be satisfied')));
  assert.equal(boiler.confidence, 'medium');
  const clean = evaluateApplicability(manufacturing).find(item => item.ruleId === 'factory-plan')!;
  assert.deepEqual(clean.blockers, []);
  assert.equal(clean.confidence, 'high');
});

test('dependency graph exposes a topological order and detects no cycles in the rulebook', () => {
  const graph = dependencyGraph(manufacturing);
  assert.equal(graph.cycles.length, 0);
  assert.equal(new Set(graph.order).size, graph.nodes.length);
  assert.ok(graph.order.indexOf('building-approval') < graph.order.indexOf('factory-plan'));
  const withBoiler = dependencyGraph({ ...manufacturing, boiler: true });
  assert.ok(withBoiler.order.indexOf('factory-plan') < withBoiler.order.indexOf('boiler'));
});

test('project data issues flag negative and non-numeric facts', () => {
  assert.deepEqual(projectDataIssues({ ...manufacturing }), []);
  const warnings = projectDataIssues({ ...manufacturing, workforce: -3, electricityLoadKw: NaN });
  assert.ok(warnings.some(item => item.startsWith('workforce')));
  assert.ok(warnings.some(item => item.startsWith('electricityLoadKw')));
  const analysis = analyzeArthixProject({ ...manufacturing, investmentCr: -1 });
  assert.ok(analysis.dataWarnings.some(item => item.startsWith('investmentCr')));
});

test('analyzeWithRulesEngine stays versioned and threads data warnings', () => {
  const analysis = analyzeWithRulesEngine(projectToProjectData({ ...manufacturing }));
  assert.equal(analysis.engineVersion, RULES_ENGINE_VERSION);
  assert.match(RULES_ENGINE_VERSION, /^arthix-rules-maharashtra-v1\.2\.0$/);
  assert.ok(Array.isArray(analysis.dataWarnings));
  assert.ok(analysis.approvals.some(approval => approval.id === 'mpcb-cte'));
});
