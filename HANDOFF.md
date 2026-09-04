# HANDOFF.md

Summary of the planning conversation, so Claude Code has full context without
you needing to re-explain it.

## Where we are
1. Hackathon: **GatewayHacks 2026** (Gateway nonprofit), fully virtual,
   deadline **Oct 2, 2026, 9:30am GMT+5:30** (~29 days out as of Sept 4, 2026).
2. Team size: up to 4 allowed; currently planning solo, teammate to be added later.
3. Track decided: **Accessibility & Health** — chosen over Equity in Education,
   Environmental Sustainability, and Open Impact & Community. Reasoning: best
   fit for an LLM-driven build (no hardware or live-data dependency needed),
   strong Social Impact scoring potential (40% of judging), and less saturated
   than the education track (which skews toward "yet another AI tutor").
4. Tech stack: **not yet decided** — deliberately deferred until a specific
   problem is chosen.
5. Idea sourcing: instead of guessing ideas from scratch, we're validating
   against Razorpay's "Fix My Itch" problem database
   (https://razorpay.com/m/fix-my-itch/), which surveyed 50,000+ people and
   scores problems by an "Itch Score" (a function of severity, TAM,
   whitespace, and frequency).
6. This is a **JS-rendered (Framer) site** — via static fetch I could only
   retrieve the "Top 10 Problems" list and the default "B2B Services" filter;
   the Healthtech category (what we actually need) isn't in the static HTML
   and needs full browser/network access to retrieve — which is why this
   handed off to Claude Code.
7. Found a community-scraped fallback dataset on GitHub (gist, no category
   tags) — reference only, not the primary source. See PRD.md for the link.

## What Claude Code should do now
See `PRD.md` → scrape the Healthtech category, produce `shortlist.md`, then
**stop and report back**. Do not pick an idea or start building anything.

## What happens after this phase
Bring `shortlist.md` back to this conversation (or continue directly with
Claude Code) to pick a final problem. At that point we'll write a fresh
`PRD.md` for the actual hackathon build — tech stack, Devpost submission
requirements (project page, ≤5 min video pitch, optional repo/live link),
and scope aligned to the judging criteria (Social Impact 40%, Technical
Execution 30%, Innovation 20%, Design/UX 10%).
