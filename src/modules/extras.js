// Small utilities that come up on almost every Webflow marketing site.

/** Reading time at ~225 wpm, minimum 1 minute. */
export function readingMinutes(text, wpm = 225) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wpm));
}

// <span wfk-readtime=".blog-rich-text"></span>  → "6 min read"
export function initReadTime(root = document) {
  let n = 0;
  for (const el of root.querySelectorAll('[wfk-readtime]')) {
    const src = root.querySelector(el.getAttribute('wfk-readtime'));
    if (!src) continue;
    el.textContent = `${readingMinutes(src.textContent)} min read`;
    n++;
  }
  return n;
}

// <button wfk-copy="#coupon-code">Copy</button> or wfk-copy="literal text" (prefix with "text:")
export function initCopy(root = document, clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : null) {
  const btns = [...root.querySelectorAll('[wfk-copy]')];
  for (const b of btns) {
    b.addEventListener('click', async (e) => {
      e.preventDefault();
      const spec = b.getAttribute('wfk-copy');
      const text = spec.startsWith('text:') ? spec.slice(5) : root.querySelector(spec)?.textContent?.trim() ?? '';
      const original = b.getAttribute('wfk-copy-label') ?? b.textContent;
      b.setAttribute('wfk-copy-label', original);
      try { await clipboard.writeText(text); b.textContent = b.getAttribute('wfk-copied') || 'Copied'; } catch { b.textContent = 'Press Ctrl+C'; }
      setTimeout(() => { b.textContent = original; }, 1600);
    });
  }
  return btns.length;
}
