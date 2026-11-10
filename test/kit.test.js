import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { matches, norm, initFilter } from '../src/modules/filter.js';
import { resolveTouch, initUtm, PARAMS } from '../src/modules/utm.js';
import { validateValue, initValidate } from '../src/modules/validate.js';
import { readingMinutes, initReadTime } from '../src/modules/extras.js';

function dom(html, url = 'https://site.webflow.io/work') {
  const window = new Window({ url });
  globalThis.CSS = window.CSS;
  window.document.body.innerHTML = html;
  return window;
}

const LIST = `
  <input wfk-search="work" aria-label="Search">
  <button wfk-filter="work" wfk-filter-field="industry" wfk-filter-value="Fintech">Fintech</button>
  <button wfk-filter="work" wfk-filter-field="industry" wfk-filter-value="SaaS">SaaS</button>
  <select wfk-filter="work" wfk-filter-field="year"><option value="">All</option><option>2025</option><option>2026</option></select>
  <span wfk-count="work"></span><div wfk-empty="work" hidden>No results</div><button wfk-reset="work">Reset</button>
  <div class="w-dyn-list" wfk-list="work"><div class="w-dyn-items">
    <div class="w-dyn-item"><h3 wfk-field="title">Checkout Redesign</h3><span wfk-field="industry">Fintech</span><span wfk-field="year">2026</span></div>
    <div class="w-dyn-item"><h3 wfk-field="title">Pricing Page Rebuild</h3><span wfk-field="industry">SaaS</span><span wfk-field="year">2026</span></div>
    <div class="w-dyn-item"><h3 wfk-field="title">Café Loyalty App</h3><span wfk-field="industry">Retail</span><span wfk-field="year">2025</span></div>
  </div></div>`;

const shown = (doc) => [...doc.querySelectorAll('.w-dyn-item')].filter((e) => !e.hidden).map((e) => e.querySelector('h3').textContent);

test('matcher: OR within a field, AND across fields, accent-insensitive search', () => {
  const item = { fields: { title: ['Café Loyalty App'], industry: ['Retail'], year: ['2025'] } };
  assert.equal(matches(item, { query: 'cafe app' }), true);
  assert.equal(matches(item, { filters: { industry: new Set(['SaaS', 'Retail']) } }), true);
  assert.equal(matches(item, { filters: { industry: new Set(['Retail']), year: new Set(['2026']) } }), false);
  assert.equal(matches(item, { query: 'loyalty', searchFields: ['industry'] }), false);
  assert.equal(norm(' Ñandú '), 'nandu');
});

test('filter: toggles, select, search, count, empty state, reset, URL sync', () => {
  const w = dom(LIST);
  const doc = w.document;
  initFilter(doc, { history: w.history, location: w.location });
  assert.equal(doc.querySelector('[wfk-count]').textContent, '3');
  doc.querySelector('[wfk-filter-value="Fintech"]').click();
  assert.deepEqual(shown(doc), ['Checkout Redesign']);
  assert.equal(doc.querySelector('[wfk-filter-value="Fintech"]').getAttribute('aria-pressed'), 'true');
  assert.match(w.location.search, /work-industry=Fintech/);
  doc.querySelector('[wfk-filter-value="SaaS"]').click();
  assert.equal(shown(doc).length, 2);
  const sel = doc.querySelector('select');
  sel.value = '2025';
  sel.dispatchEvent(new w.Event('change'));
  assert.deepEqual(shown(doc), []);
  assert.equal(doc.querySelector('[wfk-empty]').hidden, false);
  doc.querySelector('[wfk-reset]').click();
  assert.equal(shown(doc).length, 3);
  assert.equal(w.location.search, '');
});

test('filter: restores a shared URL state on load', () => {
  const w = dom(LIST, 'https://site.webflow.io/work?work-q=pricing');
  initFilter(w.document, { history: w.history, location: w.location });
  assert.deepEqual(shown(w.document), ['Pricing Page Rebuild']);
  assert.equal(w.document.querySelector('[wfk-search]').value, 'pricing');
});

test('filter: hostile list ids and field text are handled as data', () => {
  const w = dom(`<div wfk-list='a"]x'><div class="w-dyn-item"><span wfk-field="t"><img src=x onerror=alert(1)></span></div></div><span wfk-count='a"]x'></span>`);
  initFilter(w.document, { history: null, location: null });
  assert.equal(w.document.querySelector('span[wfk-count]').textContent, '1');
});

test('UTM: first touch wins for 90 days, values are sanitized and length-capped', () => {
  const first = resolveTouch({ search: '?utm_source=google&utm_campaign=<script>x' + 'a'.repeat(300), href: 'https://s.io/p?utm_source=google#top', referrer: 'https://www.google.com/', stored: null });
  assert.equal(first.isNew, true);
  assert.equal(first.touch.utm_source, 'google');
  assert.ok(!first.touch.utm_campaign.includes('<'));
  assert.equal(first.touch.utm_campaign.length, 200);
  assert.equal(first.touch.landing_page, 'https://s.io/p?utm_source=google');
  const NOW = 1_762_810_000_000;
  const later = resolveTouch({ search: '?utm_source=bing', href: 'x', referrer: '', stored: { touch: first.touch, at: NOW - 5 * 864e5 }, now: NOW });
  assert.equal(later.touch.utm_source, 'google', 'first touch wins within the window');
  const expired = resolveTouch({ search: '?utm_source=bing', href: 'x', referrer: '', stored: { touch: first.touch, at: NOW - 91 * 864e5 }, now: NOW });
  assert.equal(expired.touch.utm_source, 'bing', 'stale attribution (90+ days) is replaced');
  assert.equal(resolveTouch({ search: '', href: 'x', referrer: '', stored: { utm_source: 'legacy-shape' }, now: NOW }).isNew, true, 'malformed storage is ignored');
  assert.ok(PARAMS.includes('gclid'));
});

test('UTM: fills existing hidden inputs and creates missing ones', () => {
  const w = dom(`<form wfk-utm><input type="hidden" name="utm_source"></form>`, 'https://s.io/?utm_source=linkedin&utm_medium=paid&gclid=abc');
  const touch = initUtm(w.document, w);
  const f = w.document.querySelector('form');
  assert.equal(f.querySelector('[name=utm_source]').value, 'linkedin');
  assert.equal(f.querySelector('[name=gclid]').value, 'abc');
  assert.equal(f.querySelector('[name=utm_medium]').type, 'hidden');
  assert.equal(touch.utm_medium, 'paid');
  assert.equal(initUtm(dom('<p></p>').document, w), null);
});

test('validateValue rules', () => {
  assert.equal(validateValue({ value: '', required: true, label: 'Email' }), 'Email is required.');
  assert.equal(validateValue({ value: '' }), '');
  assert.match(validateValue({ value: 'nope', type: 'email' }), /valid email/);
  assert.equal(validateValue({ value: 'a@b.co', type: 'email' }), '');
  assert.match(validateValue({ value: 'javascript:alert(1)', type: 'url' }), /https/);
  assert.match(validateValue({ value: '12', type: 'tel' }), /7 digits/);
  assert.match(validateValue({ value: 'ab', minlength: 3, label: 'Name' }), /at least 3/);
  assert.match(validateValue({ value: 'abc', pattern: '[0-9]+', label: 'Zip' }), /expected format/);
  assert.equal(validateValue({ value: 'x', pattern: '(' }), '', 'invalid pattern attributes are ignored, not thrown');
  assert.match(validateValue({ value: 'a', matchValue: 'b', label: 'Confirm' }), /does not match/);
  assert.equal(validateValue({ value: '', required: true, message: 'Custom' }), 'Custom');
});

test('form validation blocks Webflow submit until valid, with ARIA wiring', () => {
  const w = dom(`<div class="w-form"><form wfk-validate>
      <label for="email">Work email *</label><input id="email" name="email" type="email" required>
      <label for="msg">Message</label><textarea id="msg" name="msg" minlength="10"></textarea>
      <input type="submit" value="Send"></form></div>`);
  initValidate(w.document);
  const form = w.document.querySelector('form');
  let webflowHandlerRan = 0;
  form.addEventListener('submit', (e) => { e.preventDefault(); webflowHandlerRan++; }); // stands in for Webflow's handler
  form.dispatchEvent(new w.Event('submit', { cancelable: true }));
  const email = w.document.getElementById('email');
  assert.equal(webflowHandlerRan, 0);
  assert.equal(email.getAttribute('aria-invalid'), 'true');
  const err = w.document.getElementById(email.getAttribute('aria-describedby'));
  assert.equal(err.textContent, 'Work email is required.');
  assert.equal(err.getAttribute('role'), 'alert');
  assert.equal(w.document.activeElement, email);
  email.value = 'miz@kineticgain.com';
  w.document.getElementById('msg').value = 'Hello there, team!';
  form.dispatchEvent(new w.Event('submit', { cancelable: true }));
  assert.equal(webflowHandlerRan, 1);
  assert.equal(email.hasAttribute('aria-invalid'), false);
  assert.equal(form.hasAttribute('novalidate'), true);
});

test('reading time', () => {
  assert.equal(readingMinutes(''), 1);
  assert.equal(readingMinutes('word '.repeat(1125)), 5);
  const w = dom(`<span wfk-readtime="#post"></span><article id="post">${'word '.repeat(900)}</article><span wfk-readtime="#missing"></span>`);
  assert.equal(initReadTime(w.document), 1);
  assert.equal(w.document.querySelector('[wfk-readtime]').textContent, '4 min read');
});

test('built bundle is a self-contained IIFE under 10 KB', async () => {
  const { readFileSync, statSync } = await import('node:fs');
  const path = new URL('../dist/wf-kit.min.js', import.meta.url);
  const src = readFileSync(path, 'utf8');
  assert.ok(statSync(path).size < 10 * 1024, `size ${statSync(path).size}`);
  assert.ok(!/\bimport\s*[{(]|\bexport\s/.test(src), 'no module syntax in the IIFE');
});
