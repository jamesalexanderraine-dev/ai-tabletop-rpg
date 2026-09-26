# AI Dungeon Master RPG

A single-player RPG where an LLM Dungeon Master improvises story and rulings on anything the player types. The full design is in `docs/DESIGN.md` (a snapshot of the living design doc linked at its top). Read the relevant section before building a feature.

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
- Every engine change ships with tests. Every task ends with a short playtest note appended to `DESIGN_NOTES.md` (date, what changed, what felt good or bad).
- The user often reviews from a phone: keep PR descriptions short, lead with what to try on the preview link, and keep the UI usable at phone width with the on-screen keyboard open.
- Tests must not call the real Claude API. Stub the DM interface instead.

## Current milestone

Milestone 0 (repo, CLAUDE.md, preview deploys) is in place. Next is Milestone 1: a text-only DM loop with dice, playable for a 15-minute scene.
