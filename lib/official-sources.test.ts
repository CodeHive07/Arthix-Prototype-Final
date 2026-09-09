import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractPageText, isAllowedOfficialUrl, officialAuthority, pageTitle, retrieveOfficialPages } from './official-sources';

const html = '<html><head><title>MPCB &mdash; Consent</title><script>alert(1)</script></head><body><style>.x{}</style><h1>Consent to Establish</h1><p>Apply under the Water and Air Act.</p><p>The board reviews consent applications for red, orange and green category industries across Maharashtra and publishes current requirements online.</p></body></html>';

function fakeFetch(pages: Record<string, { status: number; body: string }>) {
  let calls = 0;
  const impl = (url: string) => { calls += 1; const page = pages[url]; if (!page) return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') }); return Promise.resolve({ ok: page.status === 200, status: page.status, text: () => Promise.resolve(page.body) }); };
  return { impl, calls: () => calls };
}

test('official URL allowlist accepts government hosts and rejects everything else', () => {
  assert.equal(isAllowedOfficialUrl('https://www.mpcb.gov.in/en/consentmgt/water-and-air-act'), true);
  assert.equal(isAllowedOfficialUrl('https://midc.maharashtra.gov.in/en/investors/'), true);
  assert.equal(isAllowedOfficialUrl('https://mahadiscom.in/'), true);
  assert.equal(isAllowedOfficialUrl('https://evil.example/mpcb.gov.in'), false);
  assert.equal(isAllowedOfficialUrl('https://mpcb.gov.in.evil.example/'), false);
  assert.equal(isAllowedOfficialUrl('ftp://mpcb.gov.in/'), false);
  assert.equal(isAllowedOfficialUrl('not a url'), false);
});

test('page text extraction strips scripts, styles and tags but keeps readable text', () => {
  const text = extractPageText(html);
  assert.ok(text.includes('Consent to Establish'));
  assert.ok(text.includes('Water and Air Act'));
  assert.ok(!text.includes('alert(1)'));
  assert.ok(!text.includes('.x{}'));
  assert.ok(!text.includes('<'));
  assert.equal(pageTitle(html, 'fallback'), 'MPCB — Consent');
  assert.equal(officialAuthority('https://www.mpcb.gov.in/en/consentmgt/water-and-air-act'), 'Maharashtra Pollution Control Board');
});

test('retrieval fetches only allowlisted official pages and reports failures safely', async () => {
  const good = 'https://www.mpcb.gov.in/en/consentmgt/water-and-air-act';
  const down = 'https://midc.maharashtra.gov.in/en/investors/';
  const evil = 'https://evil.example/steal';
  const fetcher = fakeFetch({ [good]: { status: 200, body: html }, [down]: { status: 503, body: '' } });
  const pages = await retrieveOfficialPages('consent establish water act', [good, down, evil], { fetchImpl: fetcher.impl });
  assert.equal(pages.length, 2);
  assert.equal(pages[0].status, 'available');
  assert.equal(pages[0].authority, 'Maharashtra Pollution Control Board');
  assert.ok(pages[0].text.includes('Consent to Establish'));
  assert.equal(pages[1].status, 'error');
  assert.ok(pages[1].warning?.includes('503'));
  assert.equal(fetcher.calls(), 2);
});

test('retrieval caches successful pages within the TTL window', async () => {
  const url = 'https://udyamregistration.gov.in/';
  const fetcher = fakeFetch({ [url]: { status: 200, body: html } });
  await retrieveOfficialPages('udyam registration', [url], { fetchImpl: fetcher.impl });
  await retrieveOfficialPages('udyam registration', [url], { fetchImpl: fetcher.impl });
  assert.equal(fetcher.calls(), 1);
});