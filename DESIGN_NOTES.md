# Design notes

Short playtest notes, newest first. One entry per task: date, what changed, what felt good or bad, what to try next.

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
