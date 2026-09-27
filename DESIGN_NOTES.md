# Design notes

Short playtest notes, newest first. One entry per task: date, what changed, what felt good or bad, what to try next.

## 2026-09-26: Milestone 2, persistent state and tools

- The DM now has tools for everything the design doc lists except images: `update_character` (HP, XP, conditions), `add_item` / `remove_item` with free-form tags, `set_flag`, `spawn_npc` / `update_npc` with attitudes, `move_scene`, and `update_story` for the rolling "story so far" (requested every 10 turns). All of them are validated in `src/engine/tools.ts`, and impossible calls (removing an item you don't have, an unknown NPC) come back as errors the DM re-narrates.
- The state summary the DM sees each turn now includes HP, inventory with tags, scene, NPCs and flags, so the bread hat is remembered long after it leaves the 10-turn window.
- UI: a vitals bar (name, HP, location), small notes under each turn for what changed (items, HP, attitudes, new places), and a Pack sheet with items, stats, backstory and people. Opening the pack never advances time.
- Milestone 1 saves upgrade automatically, so a game in progress carries over.
- Saves stay in the browser for now. Moving them to the server needs a database on Vercel, which is a separate setup step.
- Watch on the first real playtest: does the DM call the tools without being asked (especially `add_item` for silly things)? Do the change notes feel like game feedback or like clutter?

## 2026-09-26: Milestone 1, text-only DM loop with dice

- The game opens in a cell beneath Harrowgate Keep. Sereth, the dark elf opposite, asks who you are, and your answer becomes your character.
- Claude runs the DM behind the `DungeonMaster` interface with two tools: `roll_check` (the engine rolls d20 + stat + situational bonus, max 3 rolls per turn) and `remember` (name, backstory and world facts, stored by the engine and sent back every turn).
- The DM sees a compact state summary plus the last 10 turns, not the whole transcript. Memories carry what matters past that window.
- Phone UI: book-style narration, a dice chip for each roll, the input pinned above the keyboard, and the game saved in the browser so a reload doesn't lose it.
- Tested with stubbed DMs and a fake API only. Not yet played against real Claude, since the cloud session has no API key. Watch on the first real playtest: does the DM roll often enough (or too often)? Does it call `remember` when you give your name? How long does a turn take at low effort?
- Known shortcut: until Milestone 2's server-side saves, the browser sends its state with each turn. The server validates the shape and ignores client-sent stats, but it trusts the saved history.

## 2026-09-26: Milestone 0 scaffold

- Next.js + TypeScript app with a placeholder page and `/api/health`.
- Rules engine started with the d20 check (d20 + stat modifier + situational bonus vs. easy 8 / medium 12 / hard 16 / heroic 20; natural 20 and 1 always succeed or fail).
- Nothing to playtest yet. Next: Milestone 1, the text-only DM loop.
