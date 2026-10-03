# AI Dungeon Master RPG

A single-player RPG where an LLM Dungeon Master improvises story and rulings on anything the player types. The design's single source of truth is the Notion space **LLM D&D — Game Design** (https://app.notion.com/p/3ee2bc887e058131b6a0d79876f8f8fd), reached through the Notion MCP. `docs/DESIGN.md` is an older snapshot from before the move to Notion, still the reference for anything not yet migrated (such as the build plan). If code or `docs/DESIGN.md` disagrees with Notion, Notion wins. Read the relevant section before building a feature.

## Design in Notion

The space has a Changelog, World (what the world *is*), Story (what *happens*), Mechanics (the systems spec), and a Feedback Log of James's gameplay feedback under Mechanics.

- **Start every session** by reading the Changelog entries since the last session. Claude in chat edits these pages too.
- **Status markers.** Every major decision is LOCKED (build against it), LEANING (build flexibly), OPEN (don't build assumptions on it) or REVERSED (kept for history). Only James can make something LOCKED. Claude Code can propose and mark things LEANING or OPEN.
- **Attribution.** Tag entries *(James)*, *(Claude Code, James approved)*, or *(Claude Code)* for unconfirmed proposals, which are LEANING at most.
- **When to edit Notion:** when James directs it, when he makes or reverses a decision, or when we plan a mechanic together. A plan's design decisions go back to Notion (usually Mechanics), not just into code comments. Implementation details stay in code.
- **How to edit:**
  - New decision: put it on the right page with a status and attribution.
  - Reversal: never delete. Mark it REVERSED with the date and one line on what replaced it and why, then write the replacement as a new entry.
  - James's mechanics feedback: log it in the Feedback Log (date, his words lightly cleaned, where it was applied), then apply it to the relevant page.
  - Every change also gets a Changelog line.
- **Etiquette.** Fetch a page right before editing it. Make the smallest edit that does the job, never replacing a whole page to change one section. Don't move, rename or delete pages unless James asks.
- **Where things live.** One subject, one page. World vs Story as above. Systems implied by world or story pages get summarized under Mechanics with a link back. Undecided things go in Open Threads and are also marked OPEN where they appear.
- **Snapshots.** Notion's free plan keeps only 7 days of history, so regularly snapshot the whole space into `/design` as markdown and commit it. The snapshot is read-only: edit in Notion, never in `/design`.

## Stack

- Next.js (App Router) + React + TypeScript, in `src/app`
- Rules engine: plain TypeScript in `src/engine`, no framework or network imports, unit-tested with Vitest
- DM: Claude via `@anthropic-ai/sdk`, server-side only, in `src/dm`
- Hosting: Vercel preview deploy per pull request

## Commands

- `npm run dev` starts the dev server on :3000
- `npm run check` runs typecheck and tests (run before every commit)
- `npm run build` is the production build CI runs
- `npm run check:api` makes one tiny Claude call to confirm `ANTHROPIC_API_KEY` works

## Architecture rules

- **Code owns the truth.** Dice, HP, XP, inventory, flags, NPC attitudes and location live in engine state. The model only proposes changes through tools; the engine validates and applies them, and rejects impossible calls with an error the DM can re-narrate.
- **The engine rolls, never the model.** Randomness is injected (`Rng`) so every engine function is testable deterministically.
- **Keys stay on the server.** Only route handlers and server code import from `src/dm`. Never expose `ANTHROPIC_API_KEY` to the client or log it.
- **The DM sits behind one interface** so another model can be swapped in later. The model id comes from `DM_MODEL` (default in `src/dm/config.ts`).
- The DM gets a compact state summary each turn, not the full transcript.

## Working conventions

- Work in small, PR-sized tasks that map to the build plan milestones in `docs/DESIGN.md`.
- Every engine change ships with tests. Every task ends with a short playtest note appended to `DESIGN_NOTES.md` (date, what changed, what felt good or bad). James's feedback on how the game plays also goes in the Notion Feedback Log.
- The user often reviews from a phone: keep PR descriptions short, lead with what to try on the preview link, and keep the UI usable at phone width with the on-screen keyboard open.
- Tests must not call the real Claude API. Stub the DM interface instead.

## Current milestone

Milestone 0 (repo, CLAUDE.md, preview deploys) is in place. Next is Milestone 1: a text-only DM loop with dice, playable for a 15-minute scene.
