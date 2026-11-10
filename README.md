# Webflow Attributes Kit

[![CI](https://github.com/mizcausevic-dev/webflow-attributes-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/mizcausevic-dev/webflow-attributes-kit/actions/workflows/ci.yml)
[![Pages](https://github.com/mizcausevic-dev/webflow-attributes-kit/actions/workflows/pages.yml/badge.svg)](https://mizcausevic-dev.github.io/webflow-attributes-kit/)
![Size: 3.5 KB gzip](https://img.shields.io/badge/size-3.5%20KB%20gzip-5b8cff)
![Dependencies: 0](https://img.shields.io/badge/dependencies-0-8aa8ff)

**Live demo: https://mizcausevic-dev.github.io/webflow-attributes-kit/**. It runs the production bundle on Webflow-style markup.

One script tag that lets Webflow designers add common features **with custom attributes in the Designer**, no developer ticket needed: CMS list filtering and search, first-touch UTM capture into form submissions, accessible form validation, reading time, and copy-to-clipboard buttons.

## Install

```html
<!-- Webflow: Site settings → Custom code → Footer code -->
<script defer src="https://cdn.jsdelivr.net/gh/mizcausevic-dev/webflow-attributes-kit@v1.1.0/dist/wf-kit.min.js"
        integrity="sha384-wpEft3MXy1kl0TOH9UtmMxqHj2s6tVE3MeQLPYBZEBg4RnrgM+GWI3YCGfmN9dNy" crossorigin="anonymous"></script>
```

## Attribute reference

Add these in the Designer: select element → Settings (gear icon) → **Custom attributes**.

### CMS filtering & search

| Attribute | Put it on | Effect |
|---|---|---|
| `wfk-list="work"` | Collection List wrapper (`.w-dyn-list`) | Makes its `.w-dyn-item`s filterable |
| `wfk-field="industry"` | Text element inside the item, bound to a CMS field | Value used for filters and search |
| `wfk-search="work"` (+ `wfk-search-fields="title,client"`) | Text input | Accent-insensitive multi-word search |
| `wfk-filter="work"` `wfk-filter-field="industry"` `wfk-filter-value="Fintech"` | Button | Toggle filter (`aria-pressed`); OR within a field, AND across fields |
| `wfk-filter="work"` `wfk-filter-field="year"` | Select | Single-choice filter (`""` = all) |
| `wfk-count`, `wfk-empty`, `wfk-reset`, `wfk-status` (`="work"`) | Text, empty-state block, button, live region | Result count, "no results", reset, screen-reader announcement |

The filter state syncs to the URL (`?work-industry=Fintech&work-q=pay`), so filtered views can be shared and restored.

### Forms

| Attribute | Put it on | Effect |
|---|---|---|
| `wfk-utm` | Form | Captures first-touch (kept 90 days) `utm_*`, `gclid`, `fbclid`, `msclkid`, landing page and referrer into hidden fields (created if missing), so they arrive with the Webflow submission and in `form_submission` webhooks |
| `wfk-validate` | Form | Inline errors using `required`, `type=email/url/tel`, `minlength`, `maxlength`, `pattern`. Sets `aria-invalid` + `aria-describedby`, focuses the first error, and blocks Webflow's submit handler until the form is valid |
| `wfk-match="#email"` / `wfk-message="…"` | Input | Confirm-field matching / custom error text |

### Extras

| Attribute | Effect |
|---|---|
| `wfk-readtime=".rich-text"` | Writes "N min read" (~225 wpm) |
| `wfk-copy="#coupon"` or `wfk-copy="text:WEBFLOW25"` | Copy-to-clipboard button with "Copied" feedback |

## Architecture

```
src/wf-kit.js            auto-init on DOMContentLoaded; each module isolated (one failing never breaks the others)
src/modules/filter.js    pure matcher + DOM binding + URL sync
src/modules/utm.js       pure first-touch resolver + form binding
src/modules/validate.js  pure validateValue() + accessible error wiring (capture-phase submit guard)
src/modules/extras.js    reading time, copy
dist/wf-kit.min.js       esbuild IIFE, ES2019 target, 8.3 KB min / 3.5 KB gzip
```

Every module splits a **pure function** (unit-tested directly) from a thin **DOM binding** (tested in happy-dom against Webflow's markup conventions).

## Verification status

- **Tested:** 10 tests. They cover the matcher semantics, filter toggle/select/search/count/empty/reset, URL state round-trip, hostile list ids and markup, UTM first-touch, sanitizing and length caps, hidden-field creation, every validation rule, blocking the submit until valid with ARIA wiring and focus, reading time, and the bundle budget. CI rebuilds `dist/` and fails on drift. A headless-browser smoke test runs the production bundle on the demo.
- **Not yet tested:** a published Webflow site. Webflow's paginated Collection Lists ("Load more") and lists with more than 100 items need extra handling, which isn't implemented.

## License

MIT © 2026 Mirza Causevic / Kinetic Gain LLC. Independent project, not affiliated with Webflow, Inc.
