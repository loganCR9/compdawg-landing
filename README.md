# Compdawg landing

Static marketing site for Compdawg, deployed to Cloudflare Pages at
https://compdawg.com. The signup, login, and book-a-call actions hand off to the
separate app at `app.compdawg.com` and to a Typeform.

## Layout

- `index.html`, `404.html` — the pages.
- `assets/` — styles and scripts (`app.js`, `signup.js`, `sample-report.js`).
- `brand/`, `og.png`, `favicon.ico` — brand assets.
- `functions/_middleware.js` — Cloudflare Pages Function that 301-redirects
  `www.compdawg.com` to the apex domain.
- `tests/` — Node test suite for pricing, signup, and static files.
- `scripts/` — the copy check and the production smoke test (below).
- `docs/FEATURES.md` — a visitor-facing map of every page, section, and feature.

## Development checks

Run the same checks CI runs (`.github/workflows/ci.yml`), no dependencies to
install:

```bash
node --test tests/pricing-and-signup.test.mjs
node --test tests/static-site.test.mjs
node scripts/copy-check.mjs
```

### Copy check

`scripts/copy-check.mjs` scans user-visible text in the HTML and copy strings in
`functions/` against Logan's copy-blacklist house standard
(`scripts/copy-rules.json`): em dashes, banned words and phrases, and missing
Oxford commas. It exits non-zero on any hit, so CI fails the build. Intentional
exceptions (brand names, approved copy) go in `scripts/copy-allowlist.json`.

```bash
node scripts/copy-check.mjs                 # default file set
node scripts/copy-check.mjs path/to/file.html   # check specific files
```

### Smoke test

`scripts/smoke.sh` curls the live site and checks the status code plus one
expected string per URL (home, 404, the www redirect, and the app login page).
It is read-only (GET only, no signups) and exits non-zero on any failure.

```bash
scripts/smoke.sh                               # production
BASE_URL=https://preview.pages.dev scripts/smoke.sh   # a preview build
```
