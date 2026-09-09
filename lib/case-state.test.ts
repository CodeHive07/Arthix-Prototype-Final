import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createState, validState } from './udyog';

test('case state validator accepts a generated state', () => {
  assert.equal(validState(createState()), true);
});

test('case state validator rejects an incomplete project payload', () => {
  const state = createState();
  assert.equal(validState({ ...state, project: { ...state.project, name: '' } }), false);
});

test('case state validator accepts a valid applicant profile', () => {
  const state = createState();
  state.applicantProfile = { fullName: 'Asha Kulkarni', email: 'asha@example.com', phone: '+91 98765 43210', completedAt: new Date().toISOString() };
  assert.equal(validState(state), true);
});

test('case state validator rejects an invalid applicant profile', () => {
  const state = createState();
  state.applicantProfile = { fullName: 'Asha Kulkarni', email: 'not-an-email', phone: '123', completedAt: new Date().toISOString() };
  assert.equal(validState(state), false);
});
