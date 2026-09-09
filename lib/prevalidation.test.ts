import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dossierStatus, extractEntities, kilowattsFromHp, mergeEntities, toSquareMeters, validateEntities, type ExtractedEntity } from './prevalidation';

function entity(value: string | number, confidence = .95, source = 'site.pdf'): ExtractedEntity { return { value: String(value), normalizedValue: value, confidence, sourceDocument: source, method: 'ocr' }; }

test('unit conversions are exact across land-area units', () => {
  assert.equal(toSquareMeters(1), 1);
  assert.equal(toSquareMeters(1, 'acres'), 4046.86);
  assert.equal(toSquareMeters(8500, 'sq. ft'), 789.68);
  assert.equal(toSquareMeters(100, 'sq. yd'), 83.61);
  assert.equal(toSquareMeters(2, 'hectares'), 20000);
  assert.equal(kilowattsFromHp(100), 74.6);
});

test('missing and invalid entities keep their canonical discrepancy ids', () => {
  const discrepancies = validateEntities({ Premises: entity('Pune') });
  assert.ok(discrepancies.some(item => item.id === 'hp-missing'));
  assert.ok(discrepancies.some(item => item.id === 'land-missing'));
  assert.ok(discrepancies.every(item => !item.id.includes('confidence')));
});

test('low-confidence extraction on any field demands human review', () => {
  const weak = { Premises: entity('Pune'), 'Installed HP': entity(2400, .72), 'Land Area': entity(8500) };
  const discrepancies = validateEntities(weak);
  assert.ok(discrepancies.some(item => item.id === 'hp-confidence' && item.severity === 'warning'));
  assert.ok(!discrepancies.some(item => item.id === 'premises-confidence'));
  assert.equal(dossierStatus(discrepancies.map(item => ({ ...item, resolved: false })), weak), 'review');
});

test('extractor reads labeled fields with high confidence and normalizes units', () => {
  const result = extractEntities('Project: Apex Works\nPremises: Plot 14, MIDC Chinchwad\nInstalled HP: 2,400 HP\nLand Area: 0.5 acres', 'deed.pdf');
  assert.equal(result.entities.Premises?.value, 'Plot 14, MIDC Chinchwad');
  assert.equal(result.entities['Installed HP']?.normalizedValue, 2400);
  assert.ok(result.entities['Installed HP']!.confidence >= .9);
  const land = result.entities['Land Area']!;
  assert.equal(land.unit, 'acres');
  assert.equal(land.normalizedSqM, 2023.43);
  assert.ok(land.confidence >= .9);
});

test('extractor ignores bare hp keywords that are not the field, and demotes weak reads', () => {
  const clean = extractEntities('Fuel efficiency at 60 mph 55 recorded on site.', 'log.txt');
  assert.equal(clean.entities['Installed HP'], undefined);
  const loose = extractEntities('hp 2400', 'note.txt');
  assert.equal(loose.entities['Installed HP']?.normalizedValue, 2400);
  assert.ok(loose.entities['Installed HP']!.confidence < .8);
  assert.ok(loose.discrepancies.some(item => item.id === 'hp-confidence'));
});

test('cross-field check flags land area that contradicts the project profile', () => {
  const dossier = extractEntities('Premises: Plot 14\nInstalled HP: 500 HP\nLand Area: 8500 sq. ft', 'deed.pdf', { landArea: 5000, electricityLoadKw: 500 });
  assert.ok(dossier.discrepancies.some(item => item.id === 'land-profile-mismatch' && item.severity === 'warning'));
  const consistent = extractEntities('Premises: Plot 14\nInstalled HP: 500 HP\nLand Area: 5000 sq. m', 'deed.pdf', { landArea: 5000, electricityLoadKw: 500 });
  assert.ok(!consistent.discrepancies.some(item => item.id === 'land-profile-mismatch'));
});

test('cross-field check flags installed HP that exceeds the sanctioned electricity load', () => {
  const result = extractEntities('Premises: Plot 14\nInstalled HP: 1200 HP\nLand Area: 5000 sq. m', 'deed.pdf', { landArea: 5000, electricityLoadKw: 400 });
  const mismatch = result.discrepancies.find(item => item.id === 'hp-load-mismatch');
  assert.ok(mismatch);
  assert.ok(mismatch!.message.includes('894.8 kW'));
  const within = extractEntities('Premises: Plot 14\nInstalled HP: 500 HP\nLand Area: 5000 sq. m', 'deed.pdf', { landArea: 5000, electricityLoadKw: 500 });
  assert.ok(!within.discrepancies.some(item => item.id === 'hp-load-mismatch'));
});

test('entity merge prefers the most confident source and penalizes conflicting sources', () => {
  const strong = entity(2400, .91, 'deed.pdf');
  const weak = entity(2900, .72, 'scan.jpg');
  const merged = mergeEntities({}, [{ 'Installed HP': strong }, { 'Installed HP': weak }]);
  assert.equal(merged['Installed HP']!.sourceDocument, 'deed.pdf');
  assert.ok(merged['Installed HP']!.confidence < .91);
  const agreeing = mergeEntities({}, [{ 'Installed HP': strong }, { 'Installed HP': { ...weak, normalizedValue: 2401 } }]);
  assert.equal(agreeing['Installed HP']!.confidence, .91);
  const kept = mergeEntities({ Premises: entity('Pune') }, [{}]);
  assert.equal(kept.Premises!.value, 'Pune');
});
