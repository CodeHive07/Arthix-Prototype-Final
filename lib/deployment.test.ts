import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getConfigurationIssues } from './server-config';
import { validateUpload } from './object-storage';
import { validateEntities } from './prevalidation';

test('production configuration reports missing deployment dependencies', () => {
  const issues = getConfigurationIssues({ nodeEnv: 'production', appUrl: 'https://arthix.example', ogdConfigured: false, llmConfigured: false, databaseConfigured: false, storageConfigured: false, authConfigured: false, oidcConfigured: false });
  assert.equal(issues.length, 4);
  assert.ok(issues.some(issue => issue.includes('DATABASE_URL')));
  assert.ok(issues.some(issue => issue.includes('AUTH_SECRET')));
});

test('upload validation rejects unsafe and oversized files', () => {
  assert.equal(validateUpload({ filename: '../secret.pdf', contentType: 'application/pdf', size: 100 }), 'A safe filename is required.');
  assert.equal(validateUpload({ filename: 'large.pdf', contentType: 'application/pdf', size: 21 * 1024 * 1024 }), 'File size must be between 1 byte and 20 MB.');
  assert.equal(validateUpload({ filename: 'permit.pdf', contentType: 'application/pdf', size: 100 }), null);
});

test('prevalidation flags missing canonical entities', () => {
  const discrepancies = validateEntities({ Premises: { value: 'Pune', normalizedValue: 'Pune', confidence: .95, sourceDocument: 'site.pdf', method: 'ocr' } });
  assert.ok(discrepancies.some(item => item.id === 'hp-missing'));
  assert.ok(discrepancies.some(item => item.id === 'land-missing'));
});
