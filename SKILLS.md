# SKILLS.md

Capabilities this task needs Claude Code to use.

## Required
- **Browser automation** — Playwright recommended (more reliable defaults than
  Puppeteer for this kind of task). Needed because razorpay.com/m/fix-my-itch
  is a Framer SPA; the "All Problems" data for non-default category filters
  loads via a client-side fetch after filter selection, not present in the
  initial HTML.
- **Network request inspection** — use Playwright's `page.on('response')` (or
  the CDP network domain) to capture the XHR/fetch call(s) that return
  category-filtered problem data directly as JSON. This is faster and far
  more reliable than clicking the UI and reading the rendered DOM.
- **JSON/data cleaning** — de-dup near-identical entries, normalize scores, sort.
- **Markdown table generation** — for the final `shortlist.md` output.

## Setup
```bash
npm install -D playwright
npx playwright install chromium
```
(or the Python equivalent — check for an existing `package.json` /
`requirements.txt` in the repo first and match whatever's already there)

## Explicitly not needed for this phase
No frontend framework, no backend, no database — this is a one-off scraper
plus a report. Keep it minimal.
