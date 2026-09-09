import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createState, documentLabels, syncDocuments, validState, type Project, type State } from './udyog';

const base: Project = { name: 'Apex Works', sector: 'Manufacturing', district: 'Pune', stage: 'Planning', workforce: 25, effluent: true, caseId: 'MH-001', investmentCr: 2, landArea: 5000, electricityLoadKw: 400, boiler: false };

function withDocuments(project: Project, state: State): State { return { ...state, project, documents: syncDocuments(project, state.documents) }; }

test('syncDocuments keeps the saved workspace valid when declared facts change the checklist', () => {
  const state = createState(base);
  const servicesNoEffluent: Project = { ...base, sector: 'Services', effluent: false };
  const switched = withDocuments(servicesNoEffluent, state);
  assert.equal(validState(switched), true);
  const ids = new Set(switched.documents.map(document => document.id));
  assert.ok(!ids.has('process'));
  assert.ok(ids.has('entity'));
});

test('syncDocuments preserves uploaded files and review state for surviving documents', () => {
  const state = createState(base);
  const entity = state.documents.find(document => document.id === 'entity')!;
  const updated = withDocuments({ ...base, boiler: true }, state);
  const still = updated.documents.find(document => document.id === 'entity')!;
  assert.equal(still.file, entity.file);
  assert.equal(still.checked, entity.checked);
});

test('syncDocuments adds newly required documents with clean review state', () => {
  const state = createState(base);
  const withBoiler = withDocuments({ ...base, boiler: true }, state);
  const boilerRecord = withBoiler.documents.find(document => document.id === 'boiler-record');
  assert.ok(boilerRecord);
  assert.equal(boilerRecord!.file, '');
  assert.equal(boilerRecord!.checked, false);
  assert.equal(boilerRecord!.name, documentLabels['boiler-record']);
  assert.equal(validState(withBoiler), true);
});

test('syncDocuments retires documents that are no longer required and keeps validity', () => {
  const withBoiler = createState({ ...base, boiler: true });
  const withoutBoiler = withDocuments(base, withBoiler);
  assert.ok(!withoutBoiler.documents.some(document => document.id === 'boiler-record'));
  assert.equal(validState(withoutBoiler), true);
  const servicesNoEffluent: Project = { ...base, sector: 'Services', effluent: false };
  const switched = withDocuments(servicesNoEffluent, withBoiler);
  assert.ok(!switched.documents.some(document => document.id === 'boiler-record'));
  assert.ok(switched.documents.some(document => document.id === 'load-sanction'));
  assert.equal(validState(switched), true);
});

