// Accessible inline validation for Webflow forms.
// <form wfk-validate> with inputs using standard attributes (required, type=email|url|tel, minlength, maxlength, pattern)
// plus wfk-match="#other-field" and wfk-message="custom error text".
// Errors render next to the field, wired with aria-invalid + aria-describedby; the first invalid field gets focus;
// Webflow's own submit handler only runs when the form is valid (capture-phase listener).

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Pure: returns an error message or '' for a field descriptor. */
export function validateValue({ value = '', type = 'text', required = false, minlength, maxlength, pattern, label = 'This field', matchValue, message }) {
  const v = String(value).trim();
  const fail = (m) => message || m;
  if (!v) return required ? fail(`${label} is required.`) : '';
  if (type === 'email' && !EMAIL.test(v)) return fail('Enter a valid email address, like name@company.com.');
  if (type === 'url') { try { const u = new URL(v); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { return fail('Enter a full URL starting with https://.'); } }
  if (type === 'tel' && v.replace(/\D/g, '').length < 7) return fail('Enter a phone number with at least 7 digits.');
  if (minlength && v.length < Number(minlength)) return fail(`${label} must be at least ${minlength} characters.`);
  if (maxlength && v.length > Number(maxlength)) return fail(`${label} must be at most ${maxlength} characters.`);
  if (pattern) { let re; try { re = new RegExp(`^(?:${pattern})$`, 'u'); } catch { re = null; } if (re && !re.test(v)) return fail(`${label} is not in the expected format.`); }
  if (matchValue !== undefined && v !== String(matchValue).trim()) return fail(`${label} does not match.`);
  return '';
}

function labelFor(field, root) {
  const l = field.id ? root.querySelector(`label[for="${CSS.escape(field.id)}"]`) : null;
  return (l?.textContent || field.getAttribute('aria-label') || field.name || 'This field').replace(/\*/g, '').trim();
}

export function initValidate(root = document) {
  const forms = [...root.querySelectorAll('form[wfk-validate]')];
  let seq = 0;
  for (const form of forms) {
    form.setAttribute('novalidate', '');
    const fields = () => [...form.querySelectorAll('input:not([type=hidden]):not([type=submit]), textarea, select')];
    const check = (field, show) => {
      const matchSel = field.getAttribute('wfk-match');
      const msg = validateValue({
        value: field.type === 'checkbox' ? (field.checked ? 'on' : '') : field.value,
        type: field.getAttribute('type') || 'text',
        required: field.hasAttribute('required'),
        minlength: field.getAttribute('minlength'),
        maxlength: field.getAttribute('maxlength'),
        pattern: field.getAttribute('pattern'),
        label: labelFor(field, root),
        matchValue: matchSel ? form.querySelector(matchSel)?.value ?? '' : undefined,
        message: field.getAttribute('wfk-message') || undefined,
      });
      let err = field._wfkErr;
      if (!err) {
        err = root.createElement('div');
        err.id = `wfk-err-${++seq}`;
        err.className = 'wfk-error';
        err.setAttribute('role', 'alert');
        err.hidden = true;
        field.insertAdjacentElement('afterend', err);
        field._wfkErr = err;
        const prev = field.getAttribute('aria-describedby');
        field.setAttribute('aria-describedby', prev ? `${prev} ${err.id}` : err.id);
      }
      if (show) {
        err.textContent = msg;
        err.hidden = !msg;
        if (msg) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
      }
      return !msg;
    };
    for (const f of fields()) {
      f.addEventListener('blur', () => { if (f.value || f._wfkTouched) check(f, true); f._wfkTouched = true; });
      f.addEventListener('input', () => { if (f.getAttribute('aria-invalid') === 'true') check(f, true); });
    }
    form.addEventListener('submit', (e) => {
      const results = fields().map((f) => [f, check(f, true)]);
      const firstBad = results.find(([, ok]) => !ok)?.[0];
      if (firstBad) {
        e.preventDefault();
        e.stopImmediatePropagation(); // keep Webflow's handler from posting an invalid form
        firstBad.focus();
      }
    }, true);
  }
  return forms.length;
}
