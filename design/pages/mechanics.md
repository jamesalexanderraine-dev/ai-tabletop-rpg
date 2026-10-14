# ⚙️ Mechanics

- Notion: https://app.notion.com/p/3ee2bc887e058188a4d0d5b0d2322982
- Fetched: 2026-10-14T03:54:24.604Z
- Last edited: 2026-10-14T03:54:24.604Z

---

The systems spec for implementation: every game system implied by the World and Story pages, summarized with a link back to its source. This is the page Claude Code should read before planning any feature.
<callout icon="📥" color="gray_bg">
	The engine sections below are migrated in full from the Claude Doc "AI Dungeon Master RPG — Design Doc" (James, Sep 24, 2026). Blue callouts mark where James's later playtest feedback extends or corrects them. Systems implied by the World and Story pages are added as those pages are migrated.
</callout>
## The AI Dungeon Master
**LOCKED (James).** The DM is an LLM with a strong persona prompt and a fixed set of tools. It narrates and proposes; the game engine validates and applies.
**What it does each turn**
- Reads the current scene, relevant character state and recent history.
- Decides whether the player's intent needs a roll, and sets a difficulty (easy 8, medium 12, hard 16, heroic 20).
- Narrates the outcome in 2–5 sentences, in second person.
- Calls tools to change the world, then offers an open prompt, never a multiple-choice list.
<callout icon="🔁" color="blue_bg">
	**Playtest:** in practice nearly every roll needed a 12. The GM prompt needs these tiers spelled out with example actions so difficulty actually varies. See <mention-page url="https://app.notion.com/p/3ee2bc887e0581b8bf19ec6d6517cfaa">Playtest Notes — Sep 2026</mention-page>.
</callout>
**Judgement calls it should make**
- Creative actions get a bonus, not a penalty. Collapsing a wall onto enemies is a clever ruling, not a rules violation.
- Silly choices stick. Bread worn as a hat becomes an item with tags like `edible` and `ridiculous`, and NPCs react to it.
- Failure moves the story forward. A failed lockpick means guards arrive, not a dead end.
- It says no only to things that break the fiction, like teleporting to the moon at level 1, and explains why in character.
<callout icon="🔁" color="blue_bg">
	**Playtest:** "failure moves the story forward" was being over-applied as success-with-a-tax. A failed roll must be a real failure: load-bearing intent reroutes to a harder path; non-load-bearing intent is just a no.
</callout>
**Tools it can call**
<table header-row="true">
<tr>
<td>Tool</td>
<td>What it does</td>
</tr>
<tr>
<td>`roll_check`</td>
<td>Rolls d20 + modifier against a difficulty; the engine rolls, never the model</td>
</tr>
<tr>
<td>`update_character`</td>
<td>Changes HP, conditions, XP</td>
</tr>
<tr>
<td>`add_item` / `remove_item`</td>
<td>Edits inventory, with free-form tags</td>
</tr>
<tr>
<td>`set_flag`</td>
<td>Records world facts ("mayor owes you a favour")</td>
</tr>
<tr>
<td>`spawn_npc` / `update_npc`</td>
<td>Creates or changes a named character and their attitude</td>
</tr>
<tr>
<td>`move_scene`</td>
<td>Changes location and generates its description</td>
</tr>
<tr>
<td>`generate_image`</td>
<td>Requests scene art or a portrait with a style prompt</td>
</tr>
</table>
**Tone:** warm, witty and descriptive, like a DM who enjoys the players.
**Content register — a mature (17+) game, bounded only by store policy; enforced in the DM prompt (LOCKED, James, 2026-10-10; retires "PG-13 by default").** This is an adult game by design — real vice, violence and fear are *features* that earn the rating and deepen immersion, not things to sand down. The DM narrates dark material through **implication, never depiction** (aftermath, suggestion, the locked door) — both because it's the stronger technique *and* because it's how an adult story stays inside app-store policy. The only hard boundary is **what the stores permit**: no explicit sexual content, and an **absolute** refusal of anything sexualizing minors. Because the DM improvises live, this is **part of its persona prompt**, not just the authored world: it carries the implication discipline in play and **hard-refuses** the absolute lines no matter what the player types — store-shippability is a system-prompt rule, not a content-author's hope. Full statement on <mention-page url="https://app.notion.com/p/3f62bc887e058158979ad7dcd954ef96"/>.
**When the *player* reaches for a hard line — the two-rung refusal ladder (LOCKED, James, 2026-10-10).** Because the sandbox understands intent, players *will* test the walls. The game keeps enormous freedom — **the default is YES.** A player can have their character be an outright villain who harms, betrays, and kills other characters (innocents included) cruelly and on purpose, can pursue consensual adult sex however explicit the intent, and can harm their own character to the point of death — all narrated by *implication*, answered with **in-world** consequence (not with a refusal), camera cutting away from anything explicit. (James's allowed examples: a group sexual encounter; killing an innocent; drug use to the point of death — none refused.) The refusal applies to a **short list only**, and the principle is *not* "severe harm" (ordinary murder is allowed) — it's acts that **cross a line society has collectively agreed is not acceptable even to simulate in fiction.** Two resolvers the DM applies to the refuse list's edge cases (LOCKED, James, 2026-10-10; full statement + worked examples on <mention-page url="https://app.notion.com/p/3f62bc887e058158979ad7dcd954ef96"/>): **(a) "Animal" = non-sapient, judged by SAPIENCE not body.** Sapient = has a person's mind (can reason, use language, understand, and genuinely choose/consent); sentient (merely able to feel, like a dog) is not enough. It's a *category, not a scale* — goblins/orcs/kobolds and any low-intelligence-but-speaking folk are **people**; a sapient centaur, merfolk, ghost, mind-retaining undead, construct, fae or demon is a **person** regardless of form (consensual adult involvement allowed, by implication). Only a genuinely non-sapient beast (wolf, horse) is the refused "animal"; **gray-zone/ambiguous creatures default to refusal.** **(b) "Child" = a child's BODY *or* a child's MIND — either alone disqualifies.** Apparent-child presentation is refused no matter the claimed lore age (kills the "actually 500 years old" dodge); a childlike mind is refused even in an adult body; a being must be clearly adult in *both* form and mind to be allowed (an adult ghost passes). That short list is **hard-refused** no matter the framing (see <mention-page url="https://app.notion.com/p/3f62bc887e058158979ad7dcd954ef96"/> for the canonical list). The refusal escalates, and prioritizes staying *in fiction*:
- **Rung 1 — the in-fiction redirect (the default, for any category).** The scene simply declines to proceed, shown from the *outside* with **no internal narration** — the character crosses the room and then turns away; they freeze; or something in the environment intervenes (a door opens, someone calls out, the moment passes). The "why" is left unstated, which is both more tasteful and works identically whether the blocked act was violent or sexual — you never narrate the impulse or the interiority, only the exterior beat that closes the moment. No fourth wall broken; the player keeps full agency over everything else.
- **Rung 2 — the explicit out-of-character line (only on genuine persistence).** If the player *pushes again on the same hard-line act* after a redirect — clearly testing the boundary, not just wandering into it — the DM drops character and says plainly that the game doesn't allow this. By then it's earned: a graceful off-ramp was offered and declined, so the immersion break becomes *information* (you've hit a real edge, not a narrative coincidence). Most players never see rung 2.
- **Required state (for Claude Code):** the DM must **track that a given hard-line topic has already been redirected once** this session, so it can tell a first stumble from a deliberate second push and fire rung 2 only on real persistence. This is a small piece of per-session state, not purely prompt-level — a flag per flagged topic.
- **Distinction that makes the ladder work:** separate the player who *stumbles toward* a line from the one *hammering on* it, and treat them differently without reading minds — rung 1 handles the first invisibly; rung 2 fires only on persistence. And keep the two buckets distinct: *dark-but-allowed* acts (murder, betrayal, cruelty) are narrated-with-consequence via implication and are **not** refused; only the canonical hard-refuse list gets the ladder.
## Game state and rules
**LOCKED (James).** Code owns the truth; the LLM only proposes changes through tools. This keeps rulings consistent and stops the world from drifting as conversations get long.
<table header-row="true">
<tr>
<td>Owned by code</td>
<td>Proposed by the LLM</td>
</tr>
<tr>
<td>Dice results, HP, XP, level</td>
<td>Whether a roll is needed, and its difficulty</td>
</tr>
<tr>
<td>Inventory and item tags</td>
<td>New items and what they're called</td>
</tr>
<tr>
<td>World flags and NPC attitudes</td>
<td>What those flags and attitudes mean in the story</td>
</tr>
<tr>
<td>Current scene and location graph</td>
<td>Scene descriptions and new locations</td>
</tr>
</table>
**Resolution system:** a light d20 system in the spirit of D&D 3.5, but stripped of its modifier bookkeeping. Six stats (Might, Agility, Wits, Presence, Spirit, Luck) each give a modifier from −2 to +4. A check is d20 + stat modifier + situational bonus against a difficulty.
**Memory:** the DM gets a compact state summary every turn, not the full transcript. A rolling "story so far" summary is rewritten every \~10 turns and saved with the game.
<callout icon="🔁" color="blue_bg">
	**Playtest:** summaries alone let the GM invent a player action that had scrolled out of context. Extended with a two-tier event log (full transcripts as truth, objective per-turn summaries as the index) plus fact-check and callback retrieval.
</callout>
**Guardrails:** the engine rejects impossible tool calls, like removing an item the player doesn't have, and tells the DM so it can re-narrate.
### World canon for the DM — LEANING (2026-10-13)
The DM must know what is canon and never contradict it. The **Canon Ledger** (a database on the main page: one short fact per row, with status, time scope, entities and source) is exported by Claude Code as **code-owned world canon**, extending "code owns the truth" from game state to the world itself. *(Claude, James approved, except where marked.)*
- **Per-turn canon check (James).** Each turn, before narrating, the engine checks whether the turn requires **new canon searches**: a new entity in the scene (a person, faction, region or institution), a topic the player raises, or a world claim the DM is about to make. For each, it pulls the matching ledger rows into the DM's context. Same pattern as the event-log fact-check, applied to the world.
- **Timeline gate.** Ledger rows carry a time scope (always / at the opening / story event, pending / per playthrough). Story flags record which events have happened, and the DM only receives facts valid *now*, so it can't, say, narrate an elven lord in the north before the lord's murder has happened.
- **Constraints always in the prompt.** Rows of kind "Constraint (never)" (one currency, no dark elves, and so on) sit permanently in the DM's system prompt.
- **New world facts are validated before they persist.** When the DM invents something the ledger doesn't cover (Tier 2 per-playthrough canon: fit, don't contradict), it records it through a tool that checks it against the ledger before saving, the way the engine already rejects impossible tool calls. A contradiction is rejected and the DM re-narrates.
*OPEN for Claude Code: how entities are detected each turn, the retrieval method, and how the validator works.*
## Character and progression
**LOCKED (James).** The character is the heart of the game. Think of it like importing a person's memory into a new account: a backstory document the DM reads every scene, plus structured fields (stats, skills, traits) that grow alongside it. Play writes new entries to both, so who you become and what you can do grow together.
**Don't front-load the build.** A new player hasn't earned the investment yet, so character creation is light: a name, a one-line concept, a starting stat spread. The depth arrives through leveling, when the story has its hooks in and you actually want to sit with the books and craft. Level-up is the reward you look forward to, not a chore at the start.
<callout icon="🔁" color="blue_bg">
	**Playtest:** creation now also starts with an archetype choice (Warrior / Rogue / Mage / Something else) for genre signaling and a coherent starting kit.
</callout>
### The four layers
Every moment the DM narrates reads from four layers at once:
1. **Stats** — who you fundamentally are (Might, Agility, Wits, Presence, Spirit, Luck). Broad and physical. They set what the world *assumes* about you before any roll: a 17-Might character gets asked to lift the fallen horse; a clumsy one trips over the log and sprains an ankle. Stats color the ambient narration constantly, quietly, even when nothing is rolled.
2. **Skills** — what you specifically trained (a fixed, browsable list you spend points on each level). Narrow and earned. Skills let a character punch above their stats: a weak character who invested in hand-to-hand feels like a god for one bar fight. They also unlock whole solution paths — a woodworking skill turns being stranded on an island into building a ship.
3. **Traits** — the spice the world grants you. Special abilities, often double-edged, sometimes tailored to your story by the DM. You can choose one at level-up, or find one riding along with an item or a quest reward. This is where controlled chaos lives.
4. **Dice** — the uncertainty over all of it. The big swings: persuade a dragon to burn down a rival brewery on a nat 20, or fail so magnificently on a crit that the failure becomes the story.
### Two ways stats and skills act
- **As reputation (no roll):** stats and skills set the DM's baseline for how NPCs and the world treat you by default. They shape the narration even when nothing is uncertain.
- **As dice modifiers (a roll):** when an outcome is in doubt, the same numbers feed the check. Dice handle "will this risky thing work"; the reputation layer handles "how does the world see me."
### Traits: chaos and character
Borrow the double-edged design from Starfield (the parents who love you but want rent; the buff in one setting that's a debuff in another) — the price is what makes a build feel alive. But reject its front-loading: you shouldn't commit to a playstyle before you've played. Borrow the drip-feed from Skyrim (a new toy to try every single level, always something to look forward to), but reject rigid perk trees in favor of a broad flat skill list plus emergent, DM-granted traits. Tailoring a trait to the story's balance is exactly the judgment call an AI DM can make and a scripted game can't.
### Backstory as living memory
The backstory isn't a paragraph read once and forgotten. It's a first-class document the DM references every scene, and it updates as you play — both your qualitative growth (recent actions, personal change) and your quantitative growth (stats, skills, traits) live in the same character state. The drunkard cleric from a sect of beer-brewing monks gets welcomed as a brother in one temple and eyed sideways in another, because the world knows who you chose to be.
### Menus and controls
- Character sheet: stats, HP, conditions, traits, portrait
- Spell book and skill list: learned and learnable, with search
- Inventory: items with their tags visible, so the bread hat is a real object
- Journal: auto-written quest log and NPC list
- Level-up screen: spend skill points, pick a trait, raise a stat — with an auto-assign option so the storyteller can click continue while the min-maxer pores over the choices
<callout icon="🔁" color="blue_bg">
	**Playtest:** spells and abilities also surface in the composer input as selectors showing mana/stamina affordability, and drop into the input as chips.
</callout>
## Consequences of failure
**LOCKED (James).** The guiding principle: nothing without consequence. Every failed encounter writes something into the world or the character. Death is not a binary and not a rewind — it is the bottom rung of a ladder of loss, and the DM chooses the rung that fits the stakes of the moment.
**The ladder, softest to hardest**
1. **Flee.** Sometimes the smart read. No dishonor, but still a cost: ground given up, a chance missed, the danger still waiting.
2. **Non-death defeat.** You lose but the story spares you into something worse than a clean death — captured, enslaved, sold to the goblins. Escape becomes the next quest; you keep playing from the bottom of a hole.
3. **Maiming.** You survive but marked: a lost limb, a permanent hit to a stat. This feeds the trait system — a hook for a hand, a sword strapped to the stump. The scar becomes a build, and creative recovery turns loss into character.
4. **Death.** Not a rewind. The world moved on without you, in the shape of your failure (see below).
**Death as a time skip with consequences**
When you truly die, the world does not politely wait. You get an epilogue — witnessing your own wake, seeing which companions fell and which carried on — which gives the arc emotional weight and closure. Then you return later (resurrected, dragged back, awakened), and you inherit the wreckage of your failure: the conqueror now rules, the city has fallen, companions are dead or scattered. You keep who you are — your growth, your scars — but you lose the world you were trying to save and pick up a new arc in its rubble. Only an LLM DM over a persistent, code-owned world can improvise "what the world becomes if you lose here."
**The epilogue scales with investment.** Its length and cast depend on how long you've played and what you've done. Die to a bear in the first five minutes and you get a wry tombstone ("Here lies Sir John the Second, victim of an ill-fated encounter with a bear") and the urban legend of the fool who fought it. Die eighty hours in and the epilogue earns its length: companions speak at your wake, factions react, loose threads resolve. Early recklessness should be fun to watch fail, not a pretend tragedy.
**Scale of consequences:** the size of the aftermath must match the fight. Losing a small skirmish skips days; losing a world-defining battle reshapes the world. Otherwise every death becomes an epic and loses its edge.
**Two exits from death: continuation and renewal.**
- **Continuation is the default.** You return to the same world and inherit the wreckage of your failure. This is the path players are held to.
- **Renewal is a DM-driven narrative choice, not a button.** The DM offers or requires a fresh start only when a story has genuinely ended: a true final death (dying during a death trial, or accumulated marks closing the door), an arc reaching real completion, or a death so total that continuing would feel contrived. A renewed character starts somewhere new in the same world and may carry a faint echo of the old one, like hearing their legend or finding their grave.
- **New game is separate and always available.** The pause menu always offers "New game," which starts a brand-new world. It's an out-of-fiction choice for the player, distinct from renewal, which happens inside the story.
You never start over because things got hard. You start over because a story ended, well or badly.
**Late-game safety nets, earned not given:** resurrection stones, scrolls, or a high-level party member's resurrection spell exist, but only deep in a campaign and only when hard-won. Early deaths must bite; veteran insurance is precious, hoarded, and agonizing to spend, and still carries a cost.
## Interaction and onboarding
**LOCKED (James).**
<callout icon="⚠️" color="yellow_bg">
	**Clarified 2026-10-13 (James): there is no suggestion bar, and the current prototype already works this way** (this note brings the doc in line with the build, not a new decision). Suggestions survive only as **subtle hints woven into the DM's narration text**, not as a separate UI element. **Why (James):** the player should be **creative rather than moving through the world on autopilot.** Read the suggestion bullets below in that light: the principle (point at things worth noticing, never action buttons like "Attack / Talk / Flee") governs *how the narration is written*, not a widget.
</callout>
**The text box is the steering wheel; suggestions are signposts.** You can drive anywhere by typing, but the game shows a few roads so you're never staring at a blank field. Free typing is the primary, front-and-center control; suggestions are the smaller sidekick, helpful when you're stuck.
**Suggestions are noticing-nudges, not action-buttons.** The failure mode is a menu like "Attack / Talk / Flee" — people just tap and creativity dies. Instead, suggestions point at things to notice: "the guard looks nervous," "there's a window behind him," "you still have that bread." They hint at possibility without scripting the action, so the typing instinct stays alive.
**Suggestions de-program the Zork instinct.** New players arrive expecting a guess-the-verb parser and will type timidly, probing for accepted commands. Early nudges that hint at things a parser could never handle — talk your way out, use the bread, collapse the wall — teach that the game understands intent, not commands.
**Onboarding goal: provoke a wild idea and reward it, fast.** The first ten minutes should bait the player into testing the boundaries, then show them there aren't any. The first time a player types something they *assumed* wouldn't work and the DM runs with it is the moment they stop playing Zork and start playing this game. That may be the single most important beat in the whole game.
**The opening is a tutorial disguised as a story.** Borrow the *shape* of Oblivion's prison-break start (take it directionally, not literally): a contained, low-stakes space with an obvious near-term goal, safe enough that fumbling is cheap, open enough to reward experimentation. Could be a shipwreck, a caravan, waking with amnesia in a stranger's care — the prison is the pattern, not the setting.
**Character definition through conversation.** In that opening, **your two cellmates** draw your identity out of you through dialogue — "what are you in for?", "where did you come from?" Your typed answer becomes your backstory. *(Updated 2026-10-13, James: this originally read "the dark elf in the next cell." There are no dark elves in this world, only elves, and the opening now has shared cells with two cellmates; see <mention-page url="https://app.notion.com/p/3ee2bc887e0581f0b3d7ed9de02be9c8"/>.)* This is *how* we avoid front-loading the build: the world interviews you into existence instead of showing a stat screen. It teaches three things at once — your words have permanent weight, they seed the backstory-as-living-memory document, and talking *is* playing.
## Systems implied by the world and story
*Summaries with links back to the source page. Statuses follow the source.*
- **Delta gambling mini-game** — an original game that really feels like gambling, playable on a phone. Simulated only: in-game currency, no real-money purchase or cash-out. The game's rules are OPEN. Source: <mention-page url="https://app.notion.com/p/3ee2bc887e0581aaa427c2eb12a2c14d"/>.
- **Arena: bet or enter** — wager on fights and jousts, or fight for coin yourself. Source: The Delta.
- **Orc strongman competition** — a recurring set-piece the player can enter or coach for: Boulder Hold, Barrel Toss, Jug Heave, Long Carry, Push-Up Trial. Source: <mention-page url="https://app.notion.com/p/3ee2bc887e0581aaa462fec0eba23366"/>.
- **Performance-loaded odds** — in high-stakes social gambles, the player's performance and earlier setup *load* the dice but never guarantee the outcome (the emperor's betrayal roll; the companion's uprising). Telegraph the risk beforehand so it's an informed gamble. Source: <mention-page url="https://app.notion.com/p/3ee2bc887e0581368090ec0e233de852"/>.
- **Capture instead of death, with a difficulty cascade** — failing a heist downs and captures you (rung 2 of the failure ladder above) and routes you into a harder version of another path, with the odds weighted by how you arrived. Source: The Emperor's Crown.
- **Player agency first, then a fallback** — at climactic moments, the player gets the first chance to act; if they don't, an NPC with their own will acts anyway so the scene never stalls. Source: The Emperor's Crown.
- **Keystones with multiple on-ramps** — a keystone is a situation or person reachable through any playstyle. Source: <mention-page url="https://app.notion.com/p/3ee2bc887e0581f2a8ecc9bcb9e1332e"/>.
- **Quest beats as portable templates** — roles plus a dramatic shape, specifics bound to the location. Source: Pillars.
- **Conspiracy skeleton** — anomaly → investigation → reveal, with three possible payoffs the DM picks by context. Source: <mention-page url="https://app.notion.com/p/3ee2bc887e0581bb95e5fa57cb78f744"/>.
- **Lazy-loaded scene richness** — dense simulation, sparse narration; detail generated on demand, then persisted. Source: Pillars.
- **Bond detection** — the DM notices who the player keeps returning to, jokes with, or goes out of their way for, and drapes bond-based keystones over *that* person. For the delta debt, walk down a tree of the player's closest connections until one fits. Source: <mention-page url="https://app.notion.com/p/3ee2bc887e0581f0b3d7ed9de02be9c8"/>, <mention-page url="https://app.notion.com/p/3ee2bc887e058196bcd0d4b4f4f901dd"/>.
- **NPC backgrounds and personality traits: two-way bonds** — LEANING (James, 2026-10-13). Characters should have a **defined background and personality traits that influence how they get along with the player** (James). Builds on the playtest's "characters as people" notes (a stored "sheet of the soul," relationship-gated disclosure; see <mention-page url="https://app.notion.com/p/3ee2bc887e0581b8bf19ec6d6517cfaa">Playtest Notes — Sep 2026</mention-page>) and on bond detection, which measures one direction (who the *player* keeps returning to); this adds the other, whether the NPC likes *you*, which depends on who they are. *(Claude proposal, James approved filing:)* every named NPC gets, at `spawn_npc`, a short **background** (where they're from, what shaped them; for prisoners, what they're in for) and a few **traits** (what they value, what they can't stand). **Traits are fixed and code-owned; attitude moves**: the DM proposes attitude changes and each must cite a trait (a pious cellmate warms to a player who confesses to the chaplain and cools to one who mocks him; a pragmatic smuggler likes cunning and distrusts needless violence). The player's **authored backstory counts as well as their actions**: what you say you're in for is the first thing your cellmates judge you on. Source: <mention-page url="https://app.notion.com/p/3ee2bc887e0581f0b3d7ed9de02be9c8"/>.
- **Earned standing gates content** — respect (e.g. with the north) is earned or not by what the player actually did, through several routes. Without it, the player watches events from outside with no voice in them: a closed door, not a game over. Source: <mention-page url="https://app.notion.com/p/3ee2bc887e0581a892e6fff1af0aa895"/>.
- **Loaded secrets with repeated windows** — a secret the player carries (the fountain secret) gets many contextual chances to be revealed, each with different consequences; the player is tempted, never cornered. Source: The North Rebellion.
- **NPC stances produced by the playthrough** — a pivotal NPC's position (the veteran on the rebellion) is computed from what happened (did his child come back?), not authored in advance. Source: The North Rebellion.
- **Chance is real, but weightable** — important outcomes (the child's rescue) can be weighted toward success by good play, but are never guaranteed. Source: The North Rebellion.
- **Optional affiliations as amplifiers** — joinable groups (the mercenary guild) deepen a keystone only if the player bonded with them; refusing removes that blade without breaking the keystone. Source: A Loved One's Debt.
- **The ring's hold** — temporary immortality with a soul cost. Whispers start when the ring is first worn (no roll). After its first resurrection, resisting a whisper and removing the ring each take a roll. *(Claude, unconfirmed:)* a hold meter that grows with every resurrection sets the difficulty; bonded companions load the dice. LEANING. Source: <mention-page url="https://app.notion.com/p/3ee2bc887e0581fca504dcaaf70e51b0"/>.
- **Commerce / shop-browsing system** — **LEANING (James, 2026-10-10); come back to.** When the player browses a shop's wares (swords, potions, gear), they can *see* each item's relevant info before buying: how effective a given sword is, and if an item carries a magical effect, what that effect is. A readable, inspectable storefront rather than opaque purchases. Surfaced by the mage city's Wizard's Sleeve potion menu (you'd want to read what each novelty brew does before you buy), but it's a **world-wide mechanic**, not Sleeve-specific. OPEN: how much is shown vs. hidden (does an unidentified/cursed item reveal its effect, or stay a gamble?); how it reads in a text-first UI; whether the DM narrates it or it's a structured menu. Source: <mention-page url="https://app.notion.com/p/3ee2bc887e058145b352dc1b7d0eb677"/> (the Wizard's Sleeve).
	- **Two-tier shop reveal — LEANING (James, 2026-10-13).** Solves the phone-screen problem of fitting flavor *and* function on one card. **List view** shows the minimum per item: name, one-line effect, price — scannable in one thumb-flick. **Tap to expand** opens the full detail: flavor description, ingredients/make, side effects. In fiction, the tap is asking the barkeep "what's in that?" — browsing stays fast, curiosity gets rewarded.
	- **Currency tracking and pickup — LEANING (James, 2026-10-13).** Players track a coin balance and pick currency up in the world. **Ambient coin pickup (James's lean):** when you kill someone, their coin is collected automatically — no typing "I search the bandit." OPEN: how *non-coin* loot (weapons, armor) is taken — a search widget in chat vs. narration — given you can't realistically strip a bandit's armor mid-combat. **Resolved — spoils card (Claude, James approved, 2026-10-13):** split by item type — coin is automatic; gear appears on a **spoils card after the fight ends** (never mid-combat), tap to take, with weight/encumbrance as the limit; and a deliberate typed search still finds what the card doesn't show (a letter, a key, a map). "The obvious is automatic, the hidden is earned." **Pursuit rule (James, 2026-10-13):** the spoils card is only offered when the player isn't actively being pursued, *or* looting under pursuit carries a consequence — you can't strip armor while running from the guard, or if you try, more guards arrive while you're at it. **Resolved — consequence version (Claude, James approved, 2026-10-13):** looting is never blocked, it costs you, scaled by item weight — snatching a dagger costs a beat, stripping chainmail costs your whole lead; the card telegraphs the risk before you commit ("the guards are close — this will take a while"), per performance-loaded odds. Coin stays automatic even mid-chase (grabbing a purse costs no time) — the decision under pressure lives on the gear. **What drops what (James approved, 2026-10-13):** coin follows *who uses coin*, not who's humanoid — bandits, guards, mages drop coin; beasts don't, and neither do **orcs** (no currency, per <mention-page url="https://app.notion.com/p/3f52bc887e058137b7f8fbcef4db9f6c"/>). Beasts instead drop **parts** on the spoils card (hides, fangs, scales, a drake's heart) — Dungeon Meshi-flavored, and exactly what orc barter and the mage city's reagent trades value, so a fang you took is portable currency in the badlands. Exception the DM can reward: a monster that *ate* someone (a purse in a troll's gut, coins in a drake's lair) — never an automatic drop, found only by going looking (hidden-is-earned). **One currency, world-wide (LOCKED, James, 2026-10-13).** The game has a **single currency** everywhere; the orcs simply don't use it. James asked for this explicitly: in a previous playthrough, "crown coin" vs. other coin was jarring and confusing. The DM must never invent regional or rival currencies in narration (counterfeit coin is fine: it's fake money of the one currency). OPEN: whose coin it is (who mints it — if the elven crown, the orcs refusing it gets sharper).
	- **Orc barter — LEANING (James, 2026-10-13).** Orc stalls don't take coin: you trade **from your inventory.** The mechanical expression of the already-locked rule that the orcs have no standard currency (<mention-page url="https://app.notion.com/p/3f52bc887e058137b7f8fbcef4db9f6c"/>) — you *feel* the badlands sit outside the economic order the moment your purse stops working. Same two-tier layout, but the price slot reads "what'll you give for it?" and opens your inventory. *(Claude, unconfirmed:)* a **valuation flip** — gold is a shiny rock you can't eat or fight with, so prized-elsewhere goods are near-worthless and plain useful things are valuable — meat, hides, a good blade, bones/fangs as tool stock or strong material. **Not trophies (James, 2026-10-13):** an orc won't *buy* a trophy — a trophy's worth is that *you* earned it, so your kill means nothing on his wall. They value the useful and the genuinely strong, not bought glory; and orc barter is honest — no haggling, no bluffing, an orc just tells you what it's worth to him. Source: <mention-page url="https://app.notion.com/p/3ee2bc887e0581aaa462fec0eba23366"/>.
- **Mage voice and DM annotations** — mage NPCs speak in comically complex vocabulary but never obscure story-critical meaning; after the most verbose passages the DM may add a deadpan plain-language annotation ("All that to say, Turgeon was upset."). LEANING (James). *(Claude, unconfirmed:)* vocabulary as a stress tell (ornate under threat, plain when sincere or afraid); flattery of erudition lowers a mage's guard. Needs a mage-NPC directive in the DM prompt; a draft is on the source page. Source: <mention-page url="https://app.notion.com/p/3f32bc887e0581d0810fe7fd1ebf4bf3"/>.
<page url="https://app.notion.com/p/3ee2bc887e0581c0bb75fe5f4f8d9afa">Feedback Log</page>
<page url="https://app.notion.com/p/3ee2bc887e0581b8bf19ec6d6517cfaa">Playtest Notes — Sep 2026</page>
<page url="https://app.notion.com/p/3ee2bc887e0581afa814c9f0f72d6a53">Presentation & Visuals</page>
<page url="https://app.notion.com/p/3ee2bc887e0581fc9decf2985c3a7759">Architecture & Build Plan</page>
<page url="https://app.notion.com/p/3ee2bc887e05817896b2fcef3706b1d1">Abilities & Spells</page>
