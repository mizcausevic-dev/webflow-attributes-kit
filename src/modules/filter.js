// CMS list filtering + search for Webflow Collection Lists, configured with attributes.
//
// <div wfk-list="work">              (on the Collection List Wrapper .w-dyn-list or any parent)
//   <div class="w-dyn-item"> <h3 wfk-field="title">…</h3> <div wfk-field="category">Fintech</div> </div>
// <input wfk-search="work">          (text search across all wfk-field values, or wfk-search-fields="title,client")
// <button wfk-filter="work" wfk-filter-field="category" wfk-filter-value="Fintech">  (toggle; aria-pressed)
// <select wfk-filter="work" wfk-filter-field="category">                         (single choice; "" = all)
// <span wfk-count="work"></span>     <div wfk-empty="work" hidden>No results</div>
// <button wfk-reset="work">          <div wfk-status="work" aria-live="polite" class="sr-only"></div>

export const norm = (s) => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Pure matcher: item = { fields: { name: [values] } }, state = { query, searchFields, filters: { field: Set } } */
export function matches(item, { query = '', searchFields = null, filters = {} }) {
  for (const [field, values] of Object.entries(filters)) {
    if (!values || values.size === 0) continue;
    const have = (item.fields[field] ?? []).map(norm);
    if (![...values].some((v) => have.includes(norm(v)))) return false; // OR within a field, AND across fields
  }
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const hay = Object.entries(item.fields)
    .filter(([k]) => !searchFields || searchFields.includes(k))
    .flatMap(([, v]) => v).map(norm).join(' ');
  return terms.every((t) => hay.includes(t));
}

function readItem(el) {
  const fields = {};
  for (const f of el.querySelectorAll('[wfk-field]')) {
    const k = f.getAttribute('wfk-field');
    (fields[k] ??= []).push(f.textContent ?? '');
  }
  return { el, fields };
}

export function initFilter(root = document, { history = typeof window !== 'undefined' ? window.history : null, location = typeof window !== 'undefined' ? window.location : null } = {}) {
  const instances = [];
  for (const listEl of root.querySelectorAll('[wfk-list]')) {
    const id = listEl.getAttribute('wfk-list');
    // Compare attribute values directly instead of building selectors from author-supplied ids.
    const sel = (a) => [...root.querySelectorAll(`[${a}]`)].filter((e) => e.getAttribute(a) === id);
    const itemEls = [...listEl.querySelectorAll('.w-dyn-item, [wfk-item]')];
    const items = itemEls.map(readItem);
    const search = sel('wfk-search')[0] ?? null;
    const controls = sel('wfk-filter');
    const state = { query: '', searchFields: search?.getAttribute('wfk-search-fields')?.split(',').map((s) => s.trim()) ?? null, filters: {} };

    // Restore from the URL (shareable filtered views), e.g. ?work-q=pay&work-category=Fintech
    const params = location ? new URLSearchParams(location.search) : new URLSearchParams();
    if (search && params.get(`${id}-q`)) { state.query = params.get(`${id}-q`); search.value = state.query; }
    for (const c of controls) {
      const field = c.getAttribute('wfk-filter-field');
      const wanted = params.getAll(`${id}-${field}`);
      if (!wanted.length) continue;
      if (c.tagName === 'SELECT') { c.value = wanted[0]; } else if (wanted.map(norm).includes(norm(c.getAttribute('wfk-filter-value')))) c.setAttribute('aria-pressed', 'true');
    }

    const collect = () => {
      const filters = {};
      for (const c of controls) {
        const field = c.getAttribute('wfk-filter-field');
        filters[field] ??= new Set();
        if (c.tagName === 'SELECT') { if (c.value) filters[field].add(c.value); } else if (c.getAttribute('aria-pressed') === 'true' || c.checked) filters[field].add(c.getAttribute('wfk-filter-value'));
      }
      state.filters = filters;
      state.query = search?.value ?? '';
    };

    const apply = ({ syncUrl = true } = {}) => {
      collect();
      let shown = 0;
      for (const it of items) {
        const ok = matches(it, state);
        it.el.hidden = !ok;
        if (ok) shown++;
      }
      for (const c of sel('wfk-count')) c.textContent = String(shown);
      for (const e of sel('wfk-empty')) e.hidden = shown !== 0;
      for (const s of sel('wfk-status')) s.textContent = `${shown} of ${items.length} results`;
      if (syncUrl && history && location) {
        const p = new URLSearchParams(location.search);
        [...p.keys()].filter((k) => k.startsWith(`${id}-`)).forEach((k) => p.delete(k));
        if (state.query) p.set(`${id}-q`, state.query);
        for (const [f, vals] of Object.entries(state.filters)) for (const v of vals) p.append(`${id}-${f}`, v);
        const qs = p.toString();
        history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
      }
      return shown;
    };

    let t;
    search?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 150); });
    for (const c of controls) {
      if (c.tagName === 'SELECT' || c.type === 'checkbox' || c.type === 'radio') c.addEventListener('change', () => apply());
      else {
        if (!c.hasAttribute('aria-pressed')) c.setAttribute('aria-pressed', 'false');
        c.addEventListener('click', (e) => { e.preventDefault(); c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true')); apply(); });
      }
    }
    for (const r of sel('wfk-reset')) r.addEventListener('click', (e) => {
      e.preventDefault();
      if (search) search.value = '';
      for (const c of controls) { if (c.tagName === 'SELECT') c.value = ''; else if ('checked' in c && (c.type === 'checkbox' || c.type === 'radio')) c.checked = false; else c.setAttribute('aria-pressed', 'false'); }
      apply();
    });
    apply({ syncUrl: false });
    instances.push({ id, apply, items: items.length });
  }
  return instances;
}
