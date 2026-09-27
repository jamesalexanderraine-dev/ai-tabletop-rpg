# LLM D&D — Updates & Fixes

> Snapshot of the living doc from playtesting (created 2026-09-26): https://claude.ai/artifact/5osCBPeKd1rBpcdsMMevs6
> It refines and in places overrides `docs/DESIGN.md`. The living doc is the source of truth; if they disagree, ask before building.
> Clarified by James on 2026-09-27: "no tappable chips" means no suggestion chips; the ability chips in the composer (below) stay. On failure: in general the story should progress forward, but a failure is a real failure with real consequences. Sometimes a failure may just have to derail the story, but the ideal is to progress the story by letting the player establish alternate routes in the face of a failure, never by making the failure a success.

## Core gameplay — working, protect it

The core loop is fun and the emotional investment is real. In the prototype (no saving yet) the player already feels attached to their character and reluctant to let them go. That attachment is the hard part to manufacture, and it's landing.

What's driving it:

- **Player-authored identity.** Through choices, the player fleshes out who their character is and infers their goals. Example: a sorcerer imprisoned for carrying an illegal dragon egg; on escape the egg is abandoned, hatches, and the dragon burns down the prison. The player read that as the dragon lashing out from losing its parent — with the player, who carried the egg for months, being that parent. They then built the first two levels toward a beastmaster who can communicate with the dragon.
- **Emergent, not scripted.** The LLM supplies raw material (the burned prison); the player authors the arc (the adoptive-parent bond). No hand-authored game could anticipate that branch.
- **Mechanics feed fiction feed emotion.** Investing in Arcana gave the player dragon lore, so they knew dragons like to den in caves and brought the dragon to one. A mechanical choice fed the narrative, which deepened the emotional core rather than dropping the thread.

Design principle to preserve: give the player enough raw material to author their own arc, and let their mechanical investments pay off in the fiction.

## Prompt fixes — Game Master behavior

### 1. A failed roll must be a real failure

**Problem.** On a failed roll, the LLM often doesn't treat it as a failure. It grants the intended outcome and applies a minor tax instead. Real example: needed a 12 to calm the dragon, rolled 11 with modifiers — the GM narrated the dragon calmed but the character took a slight injury. This happens most when the action is important to plot investment. It's the classic *fail-forward* pattern, and the GM is over-applying it to protect narrative momentum and avoid disappointing the player.

**Why it's a problem.** If failure never truly bites, success stops meaning anything. The stakes quietly evaporate.

**The fix / reframe.** A failed roll should change *what happens*, not just tax the player for succeeding anyway.

- On a fail, the intended outcome does **not** occur.
- Instead, the situation moves somewhere the player didn't want: a new complication, an escalation, or a shift in the scene. (Dragon example: it doesn't calm — it backs into a corner, takes flight, or torches a nearby cart.)
- Failure is not a dead end. The player can bounce back — the GM should offer chances to recover or try again — but recovery is a new action, not a retroactive success.
- Guard specifically against granting the intended result on important/plot-relevant rolls; that's exactly where the fudging shows up.

**Refinement — no fake successes, but no reflexive derailing either.** The severity of a failure is a contextual read of the story, not a fixed rule. Two things to avoid at once: (a) converting a fail into a success, or a success-with-a-penalty ("he gives you the amulet but is now angry"); and (b) overcorrecting so the first failure always nukes the arc the player has been building.

The real variable is whether the player's **intent is load-bearing for the narrative** — not whether they "can try again."

- **Load-bearing intent → failure reroutes, doesn't dead-end.** If the intent is essential to progress the plot, a fail closes the *current, easy path* but should open a different, usually harder one. Example: the player needs the king's amulet to stop a demonic resurrection. The king refuses (a true failure — he does not hand it over). But because the amulet is essential, the story reroutes: now the player must steal it, or the king sets a long, arduous quest to earn it. The intent survives; the free path to it dies.
- **Non-load-bearing intent → a no is just a no.** If the intent isn't essential to anything, failure can simply stand and the story owes no alternate route. Example: the player tries to convince a prince to write them into his will; he says no. That's a hard social no — not an invitation to try again, and not a reroute.

Context also matters for arcs already in motion: if the fiction has spent several turns earning a moment (e.g. five or six turns bonding with the dragon), a single failed roll shouldn't retroactively reject the whole arc. It means the action doesn't land *this turn* — the moment stays tense or unresolved — not that the relationship is over.

## UI — the composer input

### Lean into the composer pattern

The player needs to review the spells / spell-like abilities they have access to on a per-turn basis — a mage shouldn't have to reach into their inventory to remember their spells. The game is already chat-shaped and feels delightful despite that, so leaning into a familiar standard is an asset, not a compromise: new players already know how to use a composer, so there's ~zero learning curve.

Borrow the **composer input** (the LLM-chat input box with the submit button inside, plus the "+" buttons and selectors). Put a **spell selector** inside the input, and an **inventory selector** (or a subsection of it) inside it too. This turns the composer from a plain text box into a light action palette — the information sits at the point of decision, not two taps away in a menu.

### Selectables carry their usability state

Each selectable isn't just a name — it shows whether you can use it *right now*:

- A spell shows its **mana cost** and whether you can currently afford it.
- A once-per-day trait / special ability shows its **cooldown state** — whether you've already spent it today.

So the selector answers both "what can I do?" and "can I actually do it right now?" in one glance — an affordance a raw text box can't give.

### Abilities work as a reference (chip), not a commit

Selecting an ability drops it into the input as a **reference / chip** (like selecting a skill in Claude: it sits in your input meaning "use this when you perform this action"). It modifies the action you describe rather than *being* the whole action. Two levels of authoring effort, same outcome:

- **Woven in:** "I bash the door with my shield" — the ability is explicit in the narration.
- **Chip + short verb:** drop the *shield bash* chip in, then type "attack" — the chip's presence implies the attack is a shield bash.

**Bonus — removes ambiguity for the LLM.** When the chip is explicitly present, the game knows exactly which ability is being invoked, so it can deduct mana, mark a once-per-day trait spent, and apply the right mechanics with confidence — instead of guessing whether "I hit him hard" was a basic attack or a special move. The chip removes the doubt while still letting the player write freely around it.

**The chip is a convenience, not a requirement.** You don't have to specify an ability to use it. If you type "I bash the guard with my shield" with no chip attached, the LLM should still recognize that as *shield bash* and apply it — exactly like Claude can invoke a skill because the request calls for it, without you naming the skill. The ability catalog is always live to the model, and natural language alone can trigger any of it. Specifying via the chip just makes it explicit: it removes ambiguity when you want certainty, and it doubles as a way to browse what you can do. It's a shortcut, never a gate.

**Implication:** the system must reliably recognize an *unspecified* ability and apply the same mechanics — deduct mana, mark the cooldown — as it would for the chip. Otherwise freeform narration ("I bash with my shield") becomes a loophole that dodges the cost the chip would charge. Implicit and explicit use must resolve to identical mechanics.

## Onboarding & archetypes

### The problem: a new player has no context

The designer has a rich world in their head; a brand-new player has none. Dropped in cold, they don't know what they can do or who they can be, because they don't know the context they exist in. The failure mode: a prisoner in a high-fantasy prison is asked "what do you do?" and answers "I stole a car" — nothing told them what kind of story they're in.

**The balance to strike:** give the player *just enough* to know how they could fit into the world, and no more. Too little and they flail or break genre; too much and heavy exposition buries their own authorship — which is the thing that makes the game special. Give them jumping-off points, not a lore dump.

### Archetypes at the start

A quick archetype choice at the start (Warrior / Rogue / Mage) does double duty:

- **Genre signaling.** The three words plus a little imagery instantly tell the player this is high fantasy — swords and spells — without a paragraph of lore. The choice itself teaches the world.
- **A foothold for identity.** They author from a starting point instead of a blank void.
- **Makes abilities feel earned and coherent (stronger argument now).** Spells have become a delightful, key mechanic — but spells only make narrative sense for a mage. Warriors and rogues pick spell-*like* abilities that are grounded, not supernatural (a battle cry, a shield bash). The archetype is what gives each ability a reason to exist, so the ability list feels like *yours*. The class isn't a cage — it's what makes the kit coherent.

### Starting skill set: bare minimum, but not nothing

Give the player the bare minimum to make the opening interesting — not nothing. Same prison, different opening move per archetype:

- Rogue → a chance to pick the lock.
- Mage → start a fire.
- Warrior → beat up the guard.

This teaches who they are through *action*, not description — it answers "what can I do here?" concretely.

### "Something else" → generate a bespoke archetype

Starting choices: Warrior, Mage, Rogue, or **Something else**. The three defaults are pre-baked (fast entry, genre-signaling, no generation needed). "Something else" generates a genuine first-class archetype from the player's concept — not a hidden mapping onto one of the three. Generation is expected to be cheap (rough guess: well under 50 cents per archetype), which is what makes this viable.

The archetype is *actually* that concept, all the way down. Example — "I'm a chef": abilities and attributes tied entirely to cooking — strong nature knowledge from years foraging for berries, blade skill from literal knife work, throwing knives, a chef's knife as the signature weapon. The system reasons from the concept outward to a coherent, lore-grounded kit; that coherence is what makes the player feel seen.

**Balance guardrail.** A generated archetype needs guardrails so it isn't accidentally stronger or weaker than the hand-tuned three. The generation prompt should anchor the new archetype against the existing defaults — comparable number of abilities, comparable power curve, one signature weapon, etc. — so freedom doesn't break the game.

## Skills & attributes — definitions

**Clarity gap.** The skill definitions aren't clear. Selecting Arcana for the dragon character was a good guess — but a pure guess; even the person closest to this world doesn't fully know what some skills represent or how they're applied in-game. If the designer is guessing, a new player is lost. This ties back to onboarding: investing in a skill is a meaningful choice, and you can't make a meaningful choice about something you don't understand.

**Fix.** Give each **skill** and each **attribute** a short one-liner: what it covers and how it's actually used in gameplay. Not a wall of text — just enough that when deciding between (say) Arcana and something else, the player knows what they're buying and how it'll show up.

**Bonus — descriptions double as inspiration.** A good description doesn't just clarify, it seeds ideas. "Arcana: knowledge of magic, monsters, and ancient lore" plants the notion that you could use it for dragon lore — exactly the kind of jumping-off point that helps players author their own arcs. So descriptions feed the emergent storytelling, not just serve as reference: tell the player what they can do *and* nudge them toward doing something interesting with it.

## Generated imagery (explore soon, not later)

General principle: **prefer selecting from a preset library over generating on the fly** — it's both quicker and cheaper. On-the-fly generation stays available as the exception / escape hatch, not the default. The LLM's job shifts from *generate* to *select* the best-matching asset for the current scene, which is faster and more reliable (no botched mid-scene generation).

### Locations

Most locations are **archetypal** (a forest is a forest, a riverbank is a riverbank) and get revisited far more than unique spots — so a preset library covers the bulk of needs. Two tiers:

- **Story-beat locations:** specific, pre-plotted, tied to the narrative (e.g. the prison we currently start in — not locked in — with certain pre-plotted rooms/areas to choose from).
- **Archetypal locations:** generic high-fantasy places reached for constantly (forest, riverbank, tavern, cave). Keep many variants — e.g. day vs. night, weather, mood — so it stays varied, not repetitive.

The LLM picks an existing image and can put a **cooldown** on reusing it so the same forest doesn't appear twice in quick succession.

**Fallback:** when everything matching is on cooldown, or nothing in the library fits the scene well, fall back to on-the-fly generation. Library is the default; live generation is the exception.

### Characters

Same pattern and economics — most characters met are archetypal (a guard, a merchant, a villager).

- **Named characters:** actual story entities with their own portrait set. At minimum, profile images / headshots shown when they speak — across different **expressions and states** (neutral, angry, afraid, wounded, etc.) so the speaking portrait reflects the scene and conversations feel alive, not static.
- **Unnamed preset pool:** a broad set of **tagged** boilerplate character portraits. When the game introduces a character, it picks a matching preset — and that character then **becomes a real entity in that player's game**, so the same face stays consistent for that playthrough.

Unique character generation stays available as the exception, not the default.

## Chat bubbles for dialogue

Use **chat bubbles** (or similar UI) for spoken dialogue, showing the speaking character's **portrait and name** inline with the narration — to build the face–name association.

**Narration vs. dialogue split.** The narrator keeps action and staging; actual speech is lifted into a bubble with portrait + label. Example — current iteration: narrator says "Saren draws her bow" then "Saren says: prepare to die." New iteration: narrator says "Saren draws her bow," then a chat bubble with Saren's label and portrait beside it says "prepare to die." Prose stays clean and literary; speech gets visual identity.

**Why:** it's easy to lose track of who's who — a common problem in any story with a sizable cast (books included), and worst when many characters appear at once or you return after a break. A name alone is a weak memory hook; a repeated face + name builds and keeps the association. Like **Slack**, where you recognize the avatar before you read the label — pre-attentive recognition people are already trained on.

**Payoffs:**

- See who in your party is speaking pre-attentively, and who outside your party is speaking — so you parse not just *who* but *which side they're on* (big in tense scenes).
- Extra immersion from portraits, especially paired with the expression/state portraits above — an angry portrait on an angry line lands harder than plain text.

**The player gets a bubble too** — keeps it consistent and makes the player feel like a real character in the scene.

### To come back to (parked): player self-image

The player will need some affordance to design what their character looks like — if the first bubble portrait isn't at all what they pictured, that's naturally disappointing (the self-image is the one they hold most strongly). Not solving this yet.

- **V1 remedy:** seed the player's portrait from the chosen archetype's imagery (Warrior / Mage / Rogue each have an associated look), using those as the *root* for the portrait. Not full customization, but the face at least matches the identity they chose, and it reuses archetype-signaling assets.
- **Later:** full customization; and the "Something else" generated-archetype case has no pre-made portrait root, so it likely needs the customization affordance (or a generated starting portrait) first.

## Combat view (explore later, don't design now)

**Open question, parked.** Combat is the moment where spatial state matters most — who's where, what's near you, what's threatening — and right now all of that has to live in the player's head from prose alone. That's the hardest thing to track in text, and it's exactly when getting it wrong feels worst. We want *something* that shows what's going on during a combat encounter. Three candidate directions, genuinely different bets, none chosen yet:

- **A grid / mini-map.** Abstract but precise and readable at a glance. Strong for tactical clarity.
- **A generated field-of-view image.** More immersive; if it's good enough it might be *better* than a map for conveying what you actually see.
- **Reuse the portrait images spatially.** Arrange the character/enemy portraits we're already building into a smart spatial layout. Cheapest — leans on assets that already exist.

These aren't necessarily mutually exclusive. No decision needed now — just capturing that combat legibility is a real need and these are the options on the table.

## Dice roll streaming — working, protect it

**A small feature doing outsized work.** LLM streaming is set up so that when the player makes a dice check, the check streams in *first* — the action it's for, the modifiers, the target number, and the total needed — and then the dice "rolls" for about a second before the LLM's narration of the result streams in. It reads as a live rolling animation, a quick suspense/loading beat. Example: player types "I try to convince the guard I'm a nobleman and he has to let me free" → the game shows "Convince the guard — Charisma check," the target level, the modifier, and the total needed, then rolls. Turning a hidden calculation into a visible moment of suspense is a real win; keep it.

**Enemy rolls — settled no.** Only the player's rolls are shown. Enemy rolls are *not* surfaced (current behavior) and should not be added. Reasoning: a physical DM rolls behind a screen — enemy rolls are the GM's bookkeeping, and revealing them flattens the threat (seeing the goblin needed a 15 and rolled a 6 kills the tension before the narration lands). The player's rolls are theirs — the moment their investments and choices get tested, which is why the suspense works. The enemy should stay an unpredictable force the player reacts to. Keep rolls exclusive to the player.

## Difficulty class — rolls shouldn't all need a 12 (tweak)

**Observation.** Anecdotally, across multiple playthroughs, nearly every roll seems to require a **12** to pass, regardless of what's being attempted. The difficulty class is effectively constant.

**Why it matters.** A flat target number means the difficulty system isn't doing anything — only the player's modifiers move, and the difficulty of the task itself is a constant. That undercuts the whole premise that choices are meaningful: picking a locked vault should be harder than a rusty cell door; convincing a suspicious guard should be harder than a gullible one. When the target never changes, the world stops feeling responsive to what you're actually attempting.

**Likely cause.** The prompt probably doesn't give the model a difficulty scale to reason with, so it anchors on a single middle-of-the-road number every time.

**Fix (a tweak, not an overhaul).** Have the GM set the difficulty class from the actual difficulty of the action — easy tasks land lower, hard tasks higher, trivial actions don't prompt a roll at all. Give the prompt a few named difficulty tiers with example target numbers and the kind of action that fits each, so the model has a scale to map onto instead of defaulting to one value. The rolls should then spread out across the range.
