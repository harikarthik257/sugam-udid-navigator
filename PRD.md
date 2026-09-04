# PRD: [Working title: "Sugam"] — The Front Door to Every Disability Benefit

## Context
- GatewayHacks 2026, Accessibility & Health track, deadline **Oct 1, 2026, 11:59 PM
  EDT** (= Oct 2, 9:30am IST — verified against the live Devpost rules page).
- Team: solo (teammate TBD).
- This PRD supersedes the Phase 1 scraper PRD. Phase 1 (`shortlist.md`,
  `raw/healthtech_itches.json`) is preserved as historical record but the
  final idea did **not** come from that shortlist — it came from a second
  round of research-grounded brainstorming (see prior conversation).

## The problem (verified, not assumed)
India has ~63.28 million people with disabilities (NFHS-5 / ICMR estimate).
Since September 2024, the **UDID (Unique Disability ID) card is mandatory**
to access essentially every disability benefit — pension, transport
concessions, reserved education/employment quotas, and subsidized assistive
devices under schemes like ADIP (free/subsidized hearing aids, wheelchairs,
etc. for low-income households).

The blocker isn't the schemes — the money and infrastructure largely already
exist. It's awareness and navigation:
- **90%** of people don't know the online disability certificate process
  exists; **60%** don't know the UDID card exists at all (The Print /
  BehanBox reporting on DEPwD data).
- ADIP's own documented failure mode is "lack of awareness... among persons
  with disabilities themselves," not lack of funding.
- Applicants face "layers of verification, little guidance" with no
  end-to-end walkthrough, and the burden of navigating this falls hardest on
  rural applicants and women (only 15% of Indian women use the internet vs.
  25% of men — a compounding barrier for exactly the population most likely
  to need help).

This mirrors the pattern behind Be My Eyes (TechCrunch Disrupt SF 2015
winner, now a real company): the barrier was never the technology, it was
that nobody had built the obvious connective layer yet.

## What we're building
A conversational navigator, in plain language and voice, that:
1. Lets a user (or a family member helping them) describe their situation —
   "my father lost most of his hearing," "my daughter has cerebral palsy" —
   by typing or speaking, in English or Hindi.
2. Determines likely UDID/disability-certificate eligibility and generates a
   **personalized document checklist and step-by-step process guide**
   (which form, which office/portal, what to bring).
3. Explains the process in plain language, read aloud, so digital/literacy
   fluency isn't required to use the tool.

**Explicitly not a diagnosis tool.** It navigates an existing, defined
government process — it never assesses or claims a degree of disability
itself. Every output carries a visible "verify with the official portal /
your nearest District Disability Rehabilitation Centre" disclaimer.

## Why this scoping (vs. the organizers' own example ideas)
GatewayHacks' own track description names three example projects: *"A
neurodivergent-friendly UI overlay, an ambient listening device for
therapy, or a tool that helps patients easily read and understand medical
bills."* The bill-reader example is close to what many other teams will
independently build this year since it's given directly in the CFP. This
project targets the same underlying mission (make a confusing official
process navigable) at a higher-leverage entry point — the certificate that
gates every other benefit — while keeping the door open to add a
bill/insurance-document mode later using the same core engine (document
understanding → plain-language explanation → next steps), since that reuses
the architecture rather than requiring a second product.

## Architecture principle: rules-based eligibility, LLM for language only
To avoid a real credibility/safety failure mode — an AI confidently
inventing wrong eligibility criteria for a vulnerable user navigating a real
government process — eligibility logic must **not** be left to free-form LLM
generation:
- A small, hand-curated, source-cited dataset (JSON) encodes actual UDID
  eligibility criteria, required documents by disability category, and
  process steps, sourced from depwd.gov.in and state portals
  (`web/data/schemes/udid.json`).
- The LLM (see "AI provider" below) is used for: (a) turning a user's
  free-form spoken/typed description into structured fields matched against
  that dataset, via forced structured-JSON output, not free-form chat, and
  (b) turning the matched result back into a clear, warm, plain-language
  explanation, instructed to use only the facts it's given. It is not the
  source of truth for eligibility rules themselves.

## AI provider: Gemini free tier, not Anthropic (budget constraint)
No budget for paid API usage. Anthropic's API has no ongoing free tier (only
a one-time ~$5 trial credit for new accounts), so the app uses the
**Google Gemini API free tier** instead — genuinely free and ongoing (not a
trial), model `gemini-3.6-flash` (confirmed free-tier eligible; the original
choice, `gemini-2.5-flash`, turned out to be deprecated for new users —
caught live during testing, the API's own error message named the
replacement), via the `@google/genai` Node SDK. Structured output is
enforced with `responseMimeType: "application/json"` + `responseJsonSchema`
rather than function-calling, since that's the more direct fit for "always
return this exact shape." The free tier intermittently returns transient
503 "high demand" errors (observed directly in testing); the app retries
those automatically before surfacing an error.

Only one LLM call generates free-form text (a short warm opening) — the
actual steps/documents/disclaimer are rendered deterministically from the
dataset, never from LLM output, both to avoid duplicating content the
structured checklist already shows and to keep response latency down.

**Known tradeoff to flag:** Gemini's free tier's terms allow prompt/response
content to be used to improve Google's products (unlike the paid tier, which
excludes this). Given this tool may process sensitive disability/health
descriptions, this is worth surfacing to users (e.g. in the disclaimer) —
revisit if a low-cost paid tier or another provider's free credits (e.g. the
GatewayHacks "Adaption" sponsor credit, unconfirmed) become available.

## MVP scope (4 weeks, solo)
**In scope:**
- One scheme, end-to-end, done well: **UDID / disability certificate.**
- Two languages: English + Hindi (text and voice, via the browser's Web
  Speech API — no telephony infra needed for MVP).
- Web app (mobile-responsive), works with a screen reader, large-text mode,
  high contrast — the tool's own UX should demonstrate the accessibility
  principle it's built for.
- Personalized checklist output (downloadable/shareable as plain text or
  simple PDF).

**Explicitly out of scope for MVP (roadmap only, mention as designed
extension points, not promised deliverables):**
- ADIP, PM-JAY, or other scheme coverage.
- Phone-call/IVR/WhatsApp access (real accessibility win, but real telephony
  infra/cost — not a 4-week solo scope).
- The bill/insurance-document reading mode.
- Additional regional languages beyond Hindi.

## Tech stack
- **Frontend:** Next.js + React + Tailwind, deployed free on Vercel.
- **AI:** Google Gemini API free tier (`gemini-3.6-flash` via `@google/genai`)
  for NLU extraction + response generation — see "AI provider" above for why
  this isn't Claude.
- **Voice:** Web Speech API (browser-native STT/TTS) — zero extra infra.
- **Data:** hand-curated, source-cited eligibility/process dataset committed
  to the repo (`web/data/schemes/udid.json`) — not scraped, not
  LLM-generated; each entry cites its source URL.
- **Hosting:** Vercel free tier. No database required for MVP (stateless
  per-session conversation).

## Judging-criteria alignment (Social Impact 40% / Technical Execution 30% /
Innovation 20% / Design & UX 10%)
- **Social Impact:** pitch leads with the 90%/60% unawareness stat and the
  "now mandatory, blocks everything else" framing — concrete, sourced, not
  a vague appeal.
- **Technical Execution:** a real working conversational flow end-to-end
  (not a static form), backed by an actual eligibility engine, not a
  wrapper around a single LLM call.
- **Innovation:** positioning as "the front door to every other benefit,"
  plus an architecture that visibly generalizes to the organizers' own
  bill-reader example without being a copy of it.
- **Design & UX:** the product's own UI must itself be maximally
  accessible (voice-first, high contrast, screen-reader tested) — the
  design pitch and the product thesis are the same claim.

## Devpost submission requirements
Verified against the live rules page, plus the actual submission form fields
(pasted by the user, Sep 2026):
- **Project Story** — Markdown, with LaTeX support for math. Should cover:
  what inspired it, what was learned, how it was built, challenges faced.
  Best written once the MVP is actually working end-to-end and tested — the
  "challenges faced" section should be honest, not anticipatory.
- **Built With** — up to 25 tags (languages/frameworks/platforms/cloud
  services/databases/APIs). Draft, given the current stack: `nextjs`,
  `react`, `typescript`, `tailwindcss`, `google-gemini`, `gemini-3.6-flash`,
  `google-genai-sdk`, `web-speech-api`, `node.js`, `vercel`. Add `git`/
  `github` once the repo exists.
- **Try it out links** — demo site / GitHub repo (at least the GitHub link
  should be included, even if a live Vercel deploy is also added).
- **Project Media** — image gallery, JPG/PNG/GIF, 5MB max each, 3:2 ratio
  recommended, up to 15 images. At least one required.
- **Video demo** — YouTube, Facebook Video, Vimeo, or Youku URL, embedded at
  top of the page. Max 5 minutes (per rules page).
- Submission deadline: **Oct 1, 2026, 11:59 PM EDT**.

## Rough timeline
- **Week 1:** Curate the UDID eligibility/process dataset from official
  sources; scaffold Next.js app; wire up Gemini API for structured
  extraction. *(Done — see repo.)*
- **Week 2:** Build the checklist/step-by-step generator; add Web Speech
  API voice input/output; first accessibility pass.
- **Week 3:** Test against realistic scenarios (multiple disability
  categories, both languages); refine accuracy of the eligibility matching;
  UX/accessibility polish (contrast, screen reader, large-text mode).
- **Week 4:** Buffer for bugs; record the 5-minute pitch video; write the
  Devpost project page; submit with days to spare before the deadline.

## Out of scope entirely
- Any medical diagnosis or severity-assessment claim.
- Building or committing to the bill-reader / ADIP / PM-JAY / multi-language
  features beyond noting them as designed extensions — actually shipping
  those is contingent on MVP being solid first, not a fixed requirement.

## Definition of done for this document
This PRD is the accepted scope going into the build phase. Next step is
implementation — scaffolding the repo per the tech stack above.
