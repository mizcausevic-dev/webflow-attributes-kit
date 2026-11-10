// First-touch attribution into Webflow forms.
// <form wfk-utm> … </form>  → fills (or creates) hidden inputs utm_source, utm_medium, utm_campaign, utm_term,
// utm_content, gclid, fbclid, msclkid, landing_page, referrer. Webflow then includes them in the form submission
// (and in form_submission webhooks).

export const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'msclkid'];
const KEY = 'wfk:first-touch';
const MAX = 200;
export const TTL_DAYS = 90; // a first touch older than this is stale attribution; start a new one

const clean = (v) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').slice(0, MAX);

/** Pure: decide attribution from the current URL, referrer and any stored first touch. */
export function resolveTouch({ search, href, referrer, stored, now = Date.now(), ttlDays = TTL_DAYS }) {
  const p = new URLSearchParams(search);
  const fromUrl = Object.fromEntries(PARAMS.filter((k) => p.get(k)).map((k) => [k, clean(p.get(k))]));
  const fresh = stored?.touch && Number.isFinite(stored.at) && now - stored.at < ttlDays * 864e5;
  if (fresh) return { touch: stored.touch, isNew: false };
  const touch = { ...fromUrl, landing_page: clean(String(href).split('#')[0]), referrer: clean(referrer) };
  return { touch, isNew: true };
}

function storage(win) {
  try { const s = win.localStorage; s.setItem('wfk:t', '1'); s.removeItem('wfk:t'); return s; } catch { return null; }
}

export function initUtm(root = document, win = typeof window !== 'undefined' ? window : null) {
  const forms = [...root.querySelectorAll('form[wfk-utm]')];
  if (!forms.length || !win) return null;
  const store = storage(win);
  let stored = null;
  try { stored = JSON.parse(store?.getItem(KEY) ?? 'null'); } catch { stored = null; }
  const { touch, isNew } = resolveTouch({ search: win.location.search, href: win.location.href, referrer: root.referrer ?? '', stored });
  if (isNew && store) { try { store.setItem(KEY, JSON.stringify({ touch, at: Date.now() })); } catch { /* quota or privacy mode */ } }
  for (const form of forms) {
    for (const [name, value] of Object.entries(touch)) {
      if (!value) continue;
      let input = form.querySelector(`input[name="${name}"]`);
      if (!input) {
        input = root.createElement('input');
        input.type = 'hidden';
        input.name = name;
        form.append(input);
      }
      input.value = value;
    }
  }
  return touch;
}
