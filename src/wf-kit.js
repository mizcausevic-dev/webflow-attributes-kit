// Webflow Attributes Kit: paste one <script> in Site settings → Custom code → Footer.
import { initFilter } from './modules/filter.js';
import { initUtm } from './modules/utm.js';
import { initValidate } from './modules/validate.js';
import { initReadTime, initCopy } from './modules/extras.js';

export const VERSION = '1.0.0';

export function init(root = document) {
  const report = {};
  const run = (name, fn) => { try { report[name] = fn(); } catch (e) { report[name] = 'error'; console.error(`[wf-kit] ${name}:`, e); } };
  run('filter', () => initFilter(root).length);
  run('utm', () => Boolean(initUtm(root)));
  run('validate', () => initValidate(root));
  run('readtime', () => initReadTime(root));
  run('copy', () => initCopy(root));
  return report;
}

if (typeof window !== 'undefined' && !window.__WFK_NO_AUTO__) {
  const start = () => { window.wfKit = { version: VERSION, report: init(document) }; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
}
