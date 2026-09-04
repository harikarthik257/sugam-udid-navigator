# HOOKS.md

Guardrail hooks for this repo. Add the JSON below into `.claude/settings.json`
under a `"hooks"` key (create the file/folder if it doesn't exist yet).

## Why
Per `CLAUDE.md`, this phase should stop after producing `shortlist.md` and not
silently continue into building the hackathon app. This hook adds a light
safety net for that.

## Suggested hook

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Reminder: Phase 1 only — scrape + shortlist. Check PRD.md before running build/scaffold commands.' >&2"
          }
        ]
      }
    ]
  }
}
```

- This prints a soft reminder before any Bash command runs. It doesn't block
  anything — it just keeps the phase boundary visible in the transcript.
- If you'd rather have a **hard stop** (e.g. block `npm create`, `npx create-*`,
  or similar scaffolding commands until you've reviewed the shortlist), that
  needs a matcher on the specific command pattern — ask and I'll write it out.

## Notes
Hooks are optional for this phase — the working agreement in `CLAUDE.md`
(stop at phase boundaries) should be enough on its own most sessions. Add
this hook only if you notice Claude Code jumping ahead to building.
