# Design notes

Short playtest notes, newest first. One entry per task: date, what changed, what felt good or bad, what to try next.

## 2026-09-28: Switching characters, and "Something else"

- Tap your name in the header (or "Switch character" in the sheet) to see every saved character, jump straight into another, start a new one, or delete old ones. Needs server saves; with browser saves there's still one game at a time.
- "Something else" is a fourth start card: describe who you are ("a royal chef who poisoned the wrong duke") and Claude designs the archetype: name, stats, two skills, a signature weapon, an opening hook, a signature ability and ten more to grow into. You see the whole kit before playing, and can try again or reword it.
- Balance is enforced in code (`src/engine/customArchetype.ts`), not trusted to the model: 5 stat points with none above +2, two rank-1 skills, abilities unlocking on the defaults' schedule (levels 2, 2, 2, 2, 3, 3, 3, 4, 4, 5) with costs pulled into each level's range. A design that breaks the rules goes back to the model once with the problems. The same check runs every time a save loads.
- Only concepts that are magical by nature get spells and MP; everything else is stamina and never supernatural, like warriors and rogues. The signature weapon starts confiscated, as a hook to get it back.
- Cost: one call at low effort, roughly 5 cents per design (a retry doubles it).
- Tested with a fake Claude and fake database: design, preview, play, the retry after a greedy design, switching, deleting, and a level-up offering the chef's own abilities.
- Watch on the next playtest: does the kit feel like the concept "all the way down"? Are the generated abilities as useful as the hand-made ones? Is half a minute of waiting OK, or does it need a livelier loading moment?

## 2026-09-28: Server saves

- Games can now live on the server (Upstash Redis on Vercel), so they follow you across preview links and devices. Previews are separate sites to the browser, which is why Sir John seemed to vanish on a new link.
- With a database, the server loads and saves the game itself on every turn and level-up; the browser only remembers which game it was playing. Without one, everything works as before, saved in the browser.
- The start screen lists saved games ("Welcome back": name, archetype, level, place, turns, last played) above the archetype cards. "New game" in the sheet becomes "Back to the start screen" and nothing is deleted.
- A game saved in a browser before this uploads itself the first time that browser opens the site with a database connected, and a backup copy stays in the browser.
- Tested with a fake Upstash and a fake Anthropic API: upload of a browser save, a turn saving, continuing on a fresh device, a second game, and a level-up, all at phone width.
- Open question: anyone with the link can see the saved list. Fine for one player; accounts would be needed before sharing the link widely.

## 2026-09-27: Archetypes and grounded abilities

- New games open on a "Who are you?" screen: Warrior, Rogue or Mage. Each has a 5-point stat spread, two starting skill ranks and a level 1 signature ability that fits the cell: Feat of Strength (bend the bars), Makeshift Disguise (pass as a guard) or Spark (the torch). The opening narration carries a one-line hook per archetype.
- One ability catalog replaces spells. Mages keep their 12 spells (MP). Warriors and rogues get grounded, never-supernatural abilities that cost stamina, written for creative, story-moving uses outside combat as much as in it. Warrior only: lift and break things beyond normal strength, battle cry, shield another, unbreakable. Rogue only: disguise, charm (Honeyed Words), vanish, forgery, rumours, rooftops, perfect timing. Both: intimidate (Hard Stare), detect lies (Read a Liar), tracking, camp cooking, field medicine, jury-rigging, taming animals.
- `use_ability` replaces `cast_spell`. The DM must call it whenever the player's action is covered by an ability, named or not, so freeform wording costs the same (docs/UPDATES.md: implicit and explicit use resolve to identical mechanics).
- MP and stamina are one pool per character, 4 at level 1 and +2 per level; each level-up offers the archetype's own abilities.
- Older saves become mages: their spells stay valid and Spark is added.
- No once-per-day cooldowns, by decision: warrior and rogue abilities work exactly like spells (a stamina cost, usable whenever the pool allows), just never supernatural in the world.
- Not yet: "Something else" (a generated archetype).
- Watch on the next playtest: does the DM call use_ability when the player just describes the feat? Are 4 points of stamina at level 1 too tight or too loose? Do the abilities get used outside fights?

## 2026-09-27: Playtest fixes, part 1 (failure, difficulty, one-liners)

- Source: James's playtest doc, snapshotted as `docs/UPDATES.md`.
- Failed rolls are now real failures in the DM prompt. The intended outcome doesn't happen, never a success with a cost, and the situation gets worse. The story generally keeps moving by leaving room for the player to find an alternate route. Essential goals reroute to a harder path, non-essential ones are just a no, and a derail is allowed when the stakes call for it. The old line "failure moves the story forward, never a dead end" invited the soft failures seen in play, and is gone.
- Every difficulty tier now has example tasks, trivial actions get no roll, and the DM is told to spread difficulties rather than default to medium (the "everything needs a 12" finding).
- `roll_check` is only for the player's actions. Enemy and NPC outcomes are resolved out of sight, like a DM behind a screen.
- Every stat and skill has a one-liner saying what it covers and how it shows up, shown on the sheet and at level-up and given to the DM, so the player and the DM read skills the same way. Added Animal Handling (Spirit), which the dragon-raising playthrough had no skill for.
- Watch on the next playtest: do difficulties spread across 8 to 20? Do failures bite without killing the arc? Does the DM still slip into success-with-a-cost on plot-important rolls?

## 2026-09-27: Rolling dice while the DM writes

- Turns now stream to the browser as events: each roll the moment the engine makes it, the narration as the DM writes it, then the finished turn. The check still comes from the DM's own `roll_check` call, so one model makes every ruling.
- The die tumbles for about 2.4 seconds (slowing down) before landing on the real result, even when the result is already known. Narration waits until every die has landed, so the outcome is never spoiled. Crits get a pop and a glow. Reduced-motion settings skip the spin.
- In a scripted test with realistic delays: the die appears as soon as the roll arrives (0.8s in the script), lands about 2.6s later, and the text follows straight after. (Slowed by 50% after the first playtest, from 1.6s to 2.4s of spin.)
- Token usage and an estimated cost are now logged for every turn (Vercel logs, "DM turn usage"), and the system prompt is marked for caching across turns.
- Considered and deferred: a small, fast model that picks the check before the DM runs. It would show the die a little sooner but adds a call to every turn and lets two models disagree about rulings. Revisit if real turns show the die appearing too late.
- Playtest fix: the die spun hidden behind the input bar, and scrolling down to it got pulled back. The page was lining the end of the story up with the bottom of the screen, which the pinned input bar covers, and re-scrolling on every update. It now follows to the true end of the page, like a chat reply, and stops following while the player scrolls up to read.
- Watch on the first real playtest: how long before the die appears on a real turn? Does the text feel like it's typing out after the die lands, or arriving all at once?

## 2026-09-27: Milestone 3, leveling, skills, spells and traits

- Levels come from XP (level 2 at 50, 3 at 120, then steeper, up to 10). Each level: +3 max HP and MP, 2 skill points, one new spell; a stat raise on even levels and a double-edged trait on odd levels from 3. Every pick is validated in `src/engine/progression.ts`, and the server re-checks that a saved build is legal for its level.
- 15 flat skills; `roll_check` takes an optional skill and the engine adds its rank. 12 spells from level 2, cast through a new `cast_spell` tool that spends MP. The DM can also `grant_trait` a story-earned trait with an upside and a downside.
- UI: level and an MP bar in the header, a pulsing "Level up!" button when XP allows, a level-up screen with "Choose for me", and a tabbed sheet (Character, Spells with search, Pack, People).
- Character creation stays light: level 1 has no skills or spells, so the build grows from play.
- Milestone 2 saves upgrade to level 1 with their XP intact, so a long game may have a level-up waiting.
- Watch on the first real playtest: is 50 XP to level 2 about right for a 20 to 40 minute session? Does the DM use skills on rolls and bring traits' downsides into play? Is the 15-row skill list too long on a phone?

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
