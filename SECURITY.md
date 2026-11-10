# Security Policy

Please report vulnerabilities through a [private security advisory](../../security/advisories/new).

- **Zero runtime dependencies.** `dist/wf-kit.min.js` is built from `src/` with esbuild. CI rebuilds it and fails if the committed file differs, so the file a CDN serves always matches the source.
- **Subresource Integrity.** The install snippet pins a version tag and an SRI hash. If the file is modified, the browser refuses to run it.
- **No HTML injection.** The kit never writes `innerHTML`. List ids from attributes are compared as plain strings and never used to build CSS selectors.
- **Attribution data** is stripped of control characters and `<`/`>`, capped at 200 characters, and kept in `localStorage` only (first party, no network calls). If storage is blocked, the kit falls back gracefully.
- Form validation adds to Webflow's server-side handling. It doesn't replace it, and a determined client can always skip client-side checks.
