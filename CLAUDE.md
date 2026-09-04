# CLAUDE.md — gatewayhacks_26

Read automatically by Claude Code at the start of every session in this repo.
Keep it current as the project evolves.

## Project
GatewayHacks 2026 submission — Gateway nonprofit's flagship virtual hackathon.
- Deadline: **Oct 2, 2026, 9:30am GMT+5:30**
- Track: **Accessibility & Health**
- Team: solo (for now)
- Judging weights: Social Impact 40%, Technical Execution 30%, Innovation 20%, Design/UX 10%

## Current phase: Phase 2 — Building the hackathon submission (see PRD.md)
Phase 1 (problem discovery via the "Fix My Itch" scraper) is complete —
see `shortlist.md` and `raw/healthtech_itches.json` for that record. The
final idea did not come from that shortlist; after reviewing it, the user
asked to brainstorm fresh, research-grounded ideas instead, and picked a
disability-certificate (UDID) navigator concept. `PRD.md` has been rewritten
for this build — read it before doing anything else in this phase.

## Repo layout
```
D:\Projects\gatewayhacks_26\
  PRD.md          <- Phase 2 build spec (UDID navigator)
  CLAUDE.md       <- this file
  SKILLS.md       <- capabilities/tools needed (Phase 1 record; needs a
                     Phase 2 pass for the actual build's tooling)
  HOOKS.md        <- guardrail hooks for .claude/settings.json
  HANDOFF.md      <- summary of prior planning conversation (Phase 1)
  scripts/        <- Phase 1 scraper code (historical)
  raw/            <- Phase 1 raw scraped JSON (historical)
  shortlist.md    <- Phase 1 output (historical — not the source of the
                     final idea, see Current Phase note above)
  data/           <- Phase 2: hand-curated, source-cited eligibility/
                     process datasets (not yet created)
```

## Working agreements
- Read `PRD.md` before doing anything.
- Eligibility logic must be rules-based and source-cited (a hand-curated
  dataset), never left to free-form LLM generation — this is a real
  government process for a vulnerable user, not a place to guess. See
  PRD.md's "Architecture principle" section.
- Never fabricate data of any kind — problem data (Phase 1) or eligibility/
  process data (Phase 2). If a source can't be verified, say so; don't
  invent placeholder entries.
- No medical diagnosis or severity-assessment claims — this tool navigates
  an existing process, it doesn't assess disability itself.
- Stop at defined phase boundaries (see PRD "Definition of done"). Do not
  silently continue into the next phase without explicit go-ahead.
- Ask before installing anything outside this repo's scope.
