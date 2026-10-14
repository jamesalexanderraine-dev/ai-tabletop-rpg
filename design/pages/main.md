# 🎲 LLM D&D — Game Design

- Notion: https://app.notion.com/p/3ee2bc887e058131b6a0d79876f8f8fd
- Fetched: 2026-10-14T05:14:43.262Z
- Last edited: 2026-10-14T05:14:33.133Z

---

<callout icon="🧭" color="yellow_bg">
	**Session protocol — both Claudes, every session.** *(Claude, James approved, 2026-10-11)*
	1. **Start:** read the <mention-page url="https://app.notion.com/p/3ee2bc887e0581fa8ed9d727bcca3d03">Changelog</mention-page> entries since your last session, then the <mention-page url="https://app.notion.com/p/3f52bc887e05817098bfed7aea0221c3">Index & Map</mention-page>.
	2. **Fetch before you write *— or speak*.** Before you state, build on, propose, *or answer a question about* any region, race, character, keystone, quest or mechanic, fetch that subject's page *in this conversation*. **Answering a question counts** — the moment James turns the conversation to a subject ("let's talk about the prison," "what did we decide about X"), fetch its page *before your first substantive reply*, not after he points out it exists. Answering from memory feels safe but is how you contradict locked canon. The summaries on this page and in the Index are routing aids, not canon: if you haven't fetched the page this session, treat what's on it as unknown. When a subject spans pages, use the Index's "Where does X live?" list. (Caught live, 2026-10-13: answered a question about the opening prison from memory and contradicted the Story page's "standalone place between regions" with a guessed small-town lockup, before fetching.)
	3. **Label provenance.** Every claim about the world is either sourced (name the page: "per The Delta") or marked as a *proposal*. Never let canon and invention blend unmarked.
	4. **Silence isn't permission.** If the page doesn't cover something, say so ("the Orcs page doesn't define this") before proposing. Don't fill the gap quietly.
	5. **Let James finish.** In conversation (especially voice), wait for James to complete his thought before responding. Don't jump in on a half-finished sentence or start building on a partial idea — a pause is not an invitation. Answer once he's actually done. *(James, 2026-10-13.)*
	6. **Check every detail, not just the topic** *(James approved, 2026-10-13)*. Before sending any proposal, list each specific claim it uses or introduces about the world: people, institutions, currency, magic, who rules where, and *when*. Each must be found in the <mention-database url="https://app.notion.com/p/35304918bbf94f3baf37bab69020ea41">Canon Ledger</mention-database> or a page fetched in this conversation, or be tagged **New** in the reply. End every pitch with a short **"New:"** line naming the invented specifics, so James can catch them at a glance. A proposal label doesn't cover the details inside it.
	7. **Summaries are never a read.** Compaction summaries, chat memory, the Index and this page's summaries don't count as having read a page. After a conversation is compacted, re-fetch before relying on anything.
	8. **Check the time.** For anything touching the story, confirm whether it's true **at the opening** or only **after a story event** (the ledger's time scope and the <mention-page url="https://app.notion.com/p/3f92bc887e0581219114e251215faeff">Opening State</mention-page> page). Present-tense prose on a keystone page can describe a future event.
	9. **Sweep after every decision.** When James decides or reverses something, search the space for references it affects, update them in the same turn, and add or update ledger rows.
	10. **Read the whole neighbourhood before reviewing** *(James approved, 2026-10-14)*. Before auditing, reviewing or building on a page, fetch it **and every page it links to or depends on** (a questline and its keystone, a region and its races) before writing a single flag, question or proposal.
	11. **End every flag, question and proposal with a "Read:" line** *(James approved, 2026-10-14)* naming the pages actually fetched in this conversation (or the dated canon export, once it's loaded as Project knowledge). **Questions count:** asking one assumes you know how that part of the system works. If what you're about to say touches a page that isn't on the list, fetch it first. The line makes a skipped read visible to James instead of relying on Claude to notice.
	*Caught live, 2026-10-14:* during the Emperor's Crown audit, asked whether a cellmate could be the debt companion without having read A Loved One's Debt (which already says the debt falls on whichever companion you're closest to), and added an unflagged causal link on The Delta. Steps 2 and 6 already covered both; the rules failed because they depended on Claude noticing in the moment. Steps 10–11 and the canon export take that decision away.
	*Caught live, 2026-10-13:* pitched cellmates using "crown coin" (the game has one currency), a traitor who served "the elven lord" (there is none at the opening), and mage "licensing" (not part of the world). Each was an unchecked detail inside a pitch that had been labeled as a proposal.
	*Why:* a confident guess reads exactly like a fact, so unsourced assumptions are the main way canon drifts. Making the source visible is what lets James catch it.
</callout>
<callout icon="📍" color="blue_bg">
	**This is the single source of truth** for the game's world, story, and mechanics, including James's feedback on how the game should play. If code and this space disagree, this space wins until it's updated.
</callout>
## The game in one paragraph
A single-player, text-first tabletop RPG where an LLM is the dungeon master. It improvises scenes, makes DM-style judgement calls, and calls generative visuals via tool calls. It's about creativity, roleplay, and relationships rather than combat tactics. The world is a set of regions, each a civilization that sacrificed human connection to one pure idea; the player and their party are the people who choose each other over the idea.
## The world at a glance (read before worldbuilding)
**Fundamentals so no session misplaces a region or mistakes who holds power. Each region has its own page under World → Regions; this is the roster and the two load-bearing facts.**
- **The regions (8):** **Mage city** (knowledge) · **Holy region / the "Vatican"** (god, through an institution) · **The delta** (appetite) · **The north** (hard pride) · **Elven court** (performance and power) · **Dwarven mountains** (craft) · **Orc badlands** (the honest exception — no hidden idea) · **Small towns** (the in-between, devoted to no pure idea — candidate home for the thesis).
- **The crown is the ELVES. (LOCKED, James.)** The world's **one true monarchy belongs to the elves** — they are *the crown*, the actual seat of hereditary royal power. The human regions stay **fractured and self-governing, with no single human crown.** **How that fits together = federal vs. provincial (LOCKED, James, 2026-10-11):** the elves are the federal government, with supreme authority over the whole world; each human region is a province that runs its own affairs under its own leaders but ultimately answers to the crown. Analog: Game of Thrones' great houses — the Warden of the North governs the north, but ultimately bends the knee to the king. One edge: the orc badlands, which the crown leaves alone because taxing them isn't worth the cost. Full statement on <mention-page url="https://app.notion.com/p/3ee2bc887e05816f9602ecc3e25f5a4c"/> → Political shape. **The central conflict of the whole story is the elves (the crown) vs. the north** — built on the **elven fountain / immortality keystone** (the elves hoard a world-changing immortal water-source). When the story says "the crown" or "the monarchy," it means the elves, always.
- **The delta's "emperor" is NOT real monarchy. (LOCKED, James.)** He is a **self-crowned emperor** — that *is* the joke. A strongman who gave himself an imperial title and pageantry he has no legitimate claim to; the explicit analog is **Caesar in Fallout: New Vegas** (the man cosplaying Julius Caesar). His "empire" is appetite and spectacle wearing the trappings of royalty — the delta's purest expression of the one unifying sin (the costume of a virtue where the virtue has gone missing). He is emphatically **not** the crown; the elves are.
## Content standard
A mature (17+) game bounded only by store policy; the player's default answer is YES, with a short hard-refuse list. **The full statement, the canonical hard-refuse list, and the definitions of "animal" and "child" live on <mention-page url="https://app.notion.com/p/3f62bc887e058158979ad7dcd954ef96">Content Standard</mention-page>.** (LOCKED, James, 2026-10-10)
## Map
- <mention-database url="https://app.notion.com/p/35304918bbf94f3baf37bab69020ea41">Canon Ledger</mention-database> — **the fact list:** one short fact per row, with status, time scope, entities and source. The authority on what's true and when; narrative pages hold the reasoning. Check before proposing (Session protocol, step 6).
- <mention-page url="https://app.notion.com/p/3f92bc887e0581219114e251215faeff">Opening State</mention-page> — what's true when the player wakes in the cell, and which story events haven't happened yet.
- <mention-page url="https://app.notion.com/p/3ee2bc887e0581fa8ed9d727bcca3d03">Changelog</mention-page> — dated sessions: who, context, what changed. Read the entries since your last session (Session protocol, step 1).
- <mention-page url="https://app.notion.com/p/3ee2bc887e0581539a9bdd8cfb2c26d1">World</mention-page> — races and regions: what the world *is*.
- <mention-page url="https://app.notion.com/p/3ee2bc887e0581f0b3d7ed9de02be9c8">Story</mention-page> — keystones and questlines: what *happens*. The page itself is the keystone index.
	- Keystones: <mention-page url="https://app.notion.com/p/3ee2bc887e0581b5b1b8db31ea4812c8"/> · <mention-page url="https://app.notion.com/p/3ee2bc887e058146aa49facaaab076c4"/> · <mention-page url="https://app.notion.com/p/3ee2bc887e0581a892e6fff1af0aa895"/> · <mention-page url="https://app.notion.com/p/3ee2bc887e0581dfba6eead40b618bb0"/> · <mention-page url="https://app.notion.com/p/3ee2bc887e058199b618f9d97fefb529"/> · <mention-page url="https://app.notion.com/p/3ee2bc887e058196bcd0d4b4f4f901dd"/> · <mention-page url="https://app.notion.com/p/3ee2bc887e0581fca504dcaaf70e51b0"/>
	- <mention-page url="https://app.notion.com/p/3ee2bc887e0581368090ec0e233de852"/> — the delta's main questline.
- <mention-page url="https://app.notion.com/p/3ee2bc887e058188a4d0d5b0d2322982">Mechanics</mention-page> — the systems spec for implementation.
	- <mention-page url="https://app.notion.com/p/3ee2bc887e0581c0bb75fe5f4f8d9afa"/> — James's gameplay feedback, dated.
	- <mention-page url="https://app.notion.com/p/3ee2bc887e0581b8bf19ec6d6517cfaa"/> — the first prototype playtest, in full.
	- <mention-page url="https://app.notion.com/p/3ee2bc887e0581afa814c9f0f72d6a53"/> — layout dials, the vitals HUD, art direction.
	- <mention-page url="https://app.notion.com/p/3ee2bc887e0581fc9decf2985c3a7759"/> — the stack and milestones. **Claude Code: start here.**
	- <mention-page url="https://app.notion.com/p/3ee2bc887e05817896b2fcef3706b1d1"/> — mana vs. stamina, skills vs. abilities, proposed categories.
- <mention-page url="https://app.notion.com/p/3ee2bc887e0581e585abcd2887b38b94">Vision</mention-page> — what the game is: pillars, core loop, the Sep 2026 tone draft.
- <mention-page url="https://app.notion.com/p/3ee2bc887e058156a961de54ffb1f545">Thesis</mention-page> — what it's about: understanding people; the person or the principle.
- <mention-page url="https://app.notion.com/p/3ee2bc887e0581f2a8ecc9bcb9e1332e">Pillars</mention-page> — design rules every system must obey.
- <mention-page url="https://app.notion.com/p/3ee2bc887e05813abcdbd4510fc9a5a2">References</mention-page> — influences and what to take from each.
- <mention-page url="https://app.notion.com/p/3ee2bc887e0581c28880f38d032ab68d">Open Threads</mention-page> — everything undecided, including conflicts between documents.
- <mention-page url="https://app.notion.com/p/3f62bc887e058158979ad7dcd954ef96">Content Standard</mention-page> — the mature (17+) standard, the canonical hard-refuse list, and what counts as an animal or a child.
## Who works here
<table header-row="true">
<tr>
<td>Who</td>
<td>Where</td>
<td>What they do here</td>
</tr>
<tr>
<td>**James**</td>
<td>Notion app, Claude chat, Claude Code</td>
<td>Decides. Worldbuilding, mechanics feedback, reversals. Can edit any page directly.</td>
</tr>
<tr>
<td>**Claude (chat)**</td>
<td>[claude.ai](http://claude.ai), via the Notion connector</td>
<td>Worldbuilding and design conversations with James. Reads and edits these pages directly.</td>
</tr>
<tr>
<td>**Claude Code**</td>
<td>the repo, via the Notion MCP</td>
<td>Builds the game from these pages. Edits them when James directs it, when he makes or reverses a decision, or when they plan a mechanic together. Snapshots this space into the repo.</td>
</tr>
</table>
## Status markers
Every major decision carries one:
- **LOCKED** — James decided. Build against it.
- **LEANING** — Direction agreed, details may move. Build flexibly.
- **OPEN** — Undecided. Don't build assumptions on it.
- **REVERSED** — Was decided, now isn't. The full record lives in the Changelog; a page keeps a REVERSED breadcrumb only when the old idea is tempting to re-propose (see "Reversing a decision" below).
**Only James can make something LOCKED.** Either Claude can propose, draft, and mark things LEANING or OPEN, but locking needs James's say-so.
## Attribution
- *(James)* — his idea or decision.
- *(Claude, James approved)* / *(Claude Code, James approved)* — proposed by a Claude, accepted by James.
- *(Claude)* / *(Claude Code)* — proposed, not confirmed. LEANING at most.
## Making changes
- **New decision** — write it on the right page with a status and attribution, then add a Changelog line.
- **Reversing a decision (James, 2026-10-10 — revised).** History's permanent home is the **Changelog**: every reversal gets a full dated entry there (what changed, what replaced it, and why — the reasoning is design information). On the page itself you may **rewrite and merge freely** to describe current canon; you do *not* have to leave REVERSED scars everywhere. Leave a short one-line breadcrumb on the page ("was X, changed to Y — see Changelog") **only when the discarded idea is tempting enough that someone might re-propose it** — the breadcrumb's job is to stop a future session re-pitching a thing you already considered and rejected. Small or uninteresting reversals go to the Changelog alone.
- **Deleting or overwriting decided content is deliberate, never casual (James).** Freely rewriting prose to describe current canon is fine. But actually *removing* something the world decided — as opposed to restating it — is a real call: be clear that's the intent before doing it, and make sure the Changelog still carries what was there.
- **Mechanics feedback from James** — log it in the Feedback Log with the date, his words (lightly cleaned), and where it was applied. Then apply it to the relevant page.
- **Planning a mechanic in Claude Code** — the plan's design decisions come back here (usually Mechanics), not just into code comments. Implementation details stay in code.
- **Every change gets a Changelog entry.**
## Editing etiquette (for both Claudes)
Everyone edits the same live pages, so:
- **Check the docs before proposing (James, 2026-10-10; now steps 2–4 of the Session protocol at the top).** Before pitching a new idea for some part of the world, first check whether that subject is already defined — fetch the relevant page (and the <mention-page url="https://app.notion.com/p/3f52bc887e05817098bfed7aea0221c3">Index & Map</mention-page> if unsure where it lives). Don't propose from memory and risk reinventing or contradicting locked canon. Build the proposal *on* what exists, or note explicitly that nothing was there. (Caught live: nearly re-pitched an "earned hierarchy" for the orcs when rule-by-the-Strongest was already fully locked on the Orcs page.)
- Fetch a page right before editing it; don't edit from an old read.
- Make the smallest edit that does the job. Never replace a whole page to change one section.
- Don't move, rename, or delete pages without James asking.
## Before you start a session
Follow the Session protocol at the top of this page. The other Claude may have changed things since you last worked here.
## Where things live
- **One subject, one page.** A fact about the orcs goes on the Orcs page, even mid-way through the north.
- **World vs Story.** What a place or people *is* goes under World. What *happens* there (quests, keystones) goes under Story.
- **Mechanics get pulled out.** When a world or story page implies a system (gambling mini-game, dice loading, capture instead of death), it's summarized under Mechanics with a link back to the source.
- **Undecided things** go in Open Threads as well as being marked OPEN in place.
## History and backups
Notion's free plan keeps only **7 days** of page history. So Claude Code regularly snapshots this whole space into the repo's `/design` folder as markdown, committed to git. That's the permanent history. The snapshot is read-only: edit here, never there.
<page url="https://app.notion.com/p/3ee2bc887e0581fa8ed9d727bcca3d03">Changelog</page>
<page url="https://app.notion.com/p/3ee2bc887e0581539a9bdd8cfb2c26d1">World</page>
<page url="https://app.notion.com/p/3ee2bc887e0581f0b3d7ed9de02be9c8">Story</page>
<page url="https://app.notion.com/p/3ee2bc887e058188a4d0d5b0d2322982">Mechanics</page>
<page url="https://app.notion.com/p/3ee2bc887e0581e585abcd2887b38b94">Vision</page>
<page url="https://app.notion.com/p/3ee2bc887e0581c28880f38d032ab68d">Open Threads</page>
<page url="https://app.notion.com/p/3ee2bc887e058156a961de54ffb1f545">Thesis</page>
<page url="https://app.notion.com/p/3ee2bc887e0581f2a8ecc9bcb9e1332e">Pillars</page>
<page url="https://app.notion.com/p/3ee2bc887e05813abcdbd4510fc9a5a2">References</page>
<page url="https://app.notion.com/p/3f52bc887e05817098bfed7aea0221c3">Index & Map</page>
<page url="https://app.notion.com/p/3f62bc887e058158979ad7dcd954ef96">Content Standard</page>
<database url="https://app.notion.com/p/35304918bbf94f3baf37bab69020ea41" inline="false" data-source-url="collection://0a908ea4-0a02-4051-9218-0bd526e54876">Canon Ledger</database>
<page url="https://app.notion.com/p/3f92bc887e0581219114e251215faeff">Opening State</page>
