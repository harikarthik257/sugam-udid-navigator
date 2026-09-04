# Shortlist: Healthtech — Fix My Itch

Source: Razorpay "Fix My Itch" (razorpay.com/m/fix-my-itch), All Problems →
Healthtech category filter. Scraped via Playwright browser automation on
2026-09-03. Raw data: [raw/healthtech_itches.json](raw/healthtech_itches.json).

**Total Healthtech problems found: 10.** No near-duplicates — all 10 entries
cover distinct problems, so no de-duplication was needed.

| Rank | Title | Itch Score | Risk Flag | Fit Note |
|---|---|---|---|---|
| 1 | Why do medicine prices vary wildly across pharmacy chains? | 91 | — | Buildable as a crowdsourced/scraped pharmacy price-comparison app; pure software, no hardware, no diagnosis claims. |
| 2 | Why do patients lack tools to compare conflicting diagnoses confidently? | 82.5 | **HIGH RISK** | Any tool that judges which diagnosis is "right" is regulated medical advice; a 4-week prototype could only be a doctor-matching/second-opinion facilitator, not an AI arbiter of diagnoses. |
| 3 | Why do emergency rooms lack systems to prioritize critical patients instantly? | 81.5 | **HIGH RISK** | Real clinical triage requires certification and validated models; a hackathon build could only be a non-deployed simulation/demo, not a system making live triage calls. |
| 4 | Why can't doctors access patient medical histories across hospitals? | 80 | — | Buildable as a patient-controlled health-record aggregator (demo interoperability layer); no hardware, no diagnostic claims — just data access. |
| 5 | Why do rural patients waste time traveling for diagnostic tests? | 79.5 | — | Buildable as a booking/dispatch marketplace connecting patients to mobile diagnostic vans or local sample-collection agents; logistics/software only. |
| 6 | Why are diagnostic services not designed for women's privacy and mobility needs? | 78.5 | — | Buildable as a directory + companion-booking app surfacing privacy-respecting, women-friendly diagnostic centers; no diagnosis involved. |
| 7 | Why is finding specialist doctors in smaller cities hard? | 77 | — | Buildable as a telemedicine specialist directory/booking platform; stays out of HIGH RISK territory as long as it's discovery + scheduling, not remote diagnosis. |
| 8 | Why do branded drugs dominate prescriptions despite equivalent, cheaper generic alternatives? | 76 | — | Buildable as an informational app showing bioequivalence data and price savings; avoid personalized "switch to this drug" recommendations to stay clear of medical-advice territory. |
| 9 | Why do hospitals hide procedure pricing from patients? | 74.5 | — | Buildable as a crowdsourced/scraped procedure price-estimator; pure transparency tool, no diagnosis claims. |
| 10 | Why can't patients access digital copies of medical records? | 73.5 | — | Buildable as a patient-owned document vault with OCR digitization of paper reports; no hardware, no diagnostic claims. |

## Methodology note

PRD guidance was to source this via network-request inspection (Playwright
`page.on('response')`) rather than DOM scraping, since the site is a Framer
SPA. That was tried first: the underlying category data does load via a
background fetch to `framerusercontent.com/cms/.../*.framercms`, but the
response body is a proprietary Framer CMS **binary** format — not JSON, and
not standard BSON either (confirmed by attempting to parse it with the
`bson` npm package, which rejected it as structurally invalid; no public
decoder for this format could be found). Reverse-engineering an undocumented
binary layout by hand risked silently producing wrong scores, which conflicts
with this repo's "never fabricate problem data" rule.

Fallback used instead: Playwright browser automation against the **rendered
DOM** — select the Healthtech filter, then click each problem card open
(this reveals description + Severity/TAM/Whitespace/Frequency/Itch scores
that aren't present in the collapsed view). This is real displayed data, not
DOM-guessing. It was cross-validated against the raw binary capture: the
human-readable text still recoverable from the un-decoded binary response
(titles, description, category name, itch score) matched the DOM-scraped
values exactly for the sampled records, confirming the fallback is accurate.

## Scraping issues encountered
- The preferred network-JSON approach did not work — see Methodology note
  above. No pagination/rate-limiting/blocking issues were hit; Healthtech
  has exactly 10 entries total (confirmed by both the DOM scroll test and
  the raw binary capture's own `HealthTech` occurrence count — no more
  entries were found after either).
