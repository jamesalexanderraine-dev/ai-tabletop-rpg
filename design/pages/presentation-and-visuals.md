# 🎨 Presentation & Visuals

- Notion: https://app.notion.com/p/3ee2bc887e0581afa814c9f0f72d6a53
- Fetched: 2026-10-03T19:34:24.260Z
- Last edited: 2026-10-03T19:34:24.260Z

---

## Art direction (Oct 2026)
**LOCKED (James).** Settled on an art and imagery direction, chosen mainly on visual vibe: **Conan the Barbarian-style vintage comic-strip illustration** — a pulpy, painted and inked look with heavy shadow and linework. That specific, recognizable style also helps generation consistency. This answers the design doc's open question (painterly, pixel or ink) and supersedes the earlier references (Pokémon-style exploration, Adventure Quest, Daggerfall). The [Art Style Proofs](https://claude.ai/artifact/KRSZv6wmMPtb43g2FbdocX) artifact holds visual tests.
<callout icon="📥" color="gray_bg">
	Migrated in full from the Claude Doc "AI Dungeon Master RPG — Design Doc" (James, Sep 24, 2026). Playtest additions (composer, chat bubbles, preset image libraries, combat view) are on <mention-page url="https://app.notion.com/p/3ee2bc887e0581b8bf19ec6d6517cfaa"/>.
</callout>
**The real goal: never feel like a B2B app.** The enemy to avoid isn't text or a chat structure — it's the feeling of using a productivity tool, of "playing Cursor as a game." It should feel like interacting with a story. **OPEN:** the layout is still an open experiment, and this is a *feel* problem: it gets solved by building a few rough versions and living in them, not by arguing it on paper.
## The screen-real-estate constraint
The keyboard is the primary controller and eats 30–40% of the screen, and it should probably stay persistent. That leaves roughly half a screen to hold the latest narration, a sense of place, who's with you, and any visual content — all at once. A big pinned hero image doesn't fit that math. This is harder than it first looks; the honest approach is to prototype, not to declare an answer.
## Two dials, not a list of options
The design space is best understood as two independent knobs rather than a menu of layouts.
**Dial 1 — position on the transcript-to-book axis.** One spectrum runs from a chat transcript at one end to an illuminated book at the other:
- *Transcript end:* snappy, modern, widget-friendly; discrete rich objects (dice chips, item cards, portraits) flow by. Maps cleanly onto the tool-call architecture — each DM tool call has a natural visual home in the stream. Risk: feels like productivity software.
- *Book end:* beautifully typeset narrative as the primary texture, sparing illustrations so they stay special, mechanics rendered as tasteful visual punctuation woven into the prose (a dice roll set like a drop-cap flourish). Plays to typography strengths; photographs like a premium product.
- **The middle is the danger zone.** A bland, clean chat is exactly where it reads as software. The axis is not symmetric: the book end is safe, the far game-HUD end is safe, the middle is not.
**Dial 2 — how much the layout adapts per moment.** The DM already knows the scene, so the interface can reallocate screen to what the moment is *about*: text-dominant for quiet exploration and dialogue; a persistent widget growing for tactical combat, where positions and party health matter, shrinking the text to a blow-by-blow ticker. Combat is a state the engine tracks, so the layout can respond automatically. Transitions should grow *in* smoothly, never slam into a different-app feel.
## Two escape routes from the B2B feeling
Both solve the same problem with opposite aesthetic moves:
- **Upward into literature:** the illuminated book — a nice edition of Lord of the Rings with dice rolls thrown in. Mechanics as tasteful marginalia. Runs away from HUD conventions entirely.
- **Sideways into game-craft:** lean into RPG heritage — real health and mana bars, party portraits with status, honest video-game visual grammar, nothing resembling a settings panel.
Cheesy-or-magic is entirely a craft-of-presentation question (typography, motion, art, sound), not a structure question.
## Non-negotiable: a minimal vitals HUD
**LOCKED (James).** D&D-style play needs legible vitals at a glance — health, mana, and party status. Even the most literary version can't be pure prose; it needs a minimal, persistent status display for the numbers that matter moment to moment. Both escape routes converge on needing always-visible status furniture — they just dress it differently (marginalia vs. RPG bars).
## Candidate directions to prototype
1. **Breathe-when-keyboard-drops:** text-dominant while typing (tiny persistent location/party strip); the illustration expands when the keyboard is dismissed. Follows the compose-vs-witness rhythm.
2. **Stream-as-canvas:** the whole game is a rich vertical stream; each tool call renders inline (dice chip, item card, illustration, pinned NPC portrait). History scrolls, status stays. Must escape *feeling* like Slack through craft.
3. **Adaptive hybrid:** the stream by default, with persistent widgets that grow for combat and other spatial moments. Likely where it lands — the two dials combined.
**Aesthetic option: Undertale meets the terminal.** One direction among several. Keep the structure text- and book-heavy, but dress it in a retro text-adventure look: monospace or pixel type, terminal-flavored narration, chunky pixel sprites and portraits in the Undertale vein. Why it's interesting: it's a third escape route from the B2B feeling, into nostalgic game-craft rather than literature or a modern RPG HUD; pixel art is cheap and consistent to generate; and it plays with the Zork expectation on purpose, since the game *looks* like a parser and then understands anything you type, which makes that first wild-idea reveal land harder. The tension to watch: a bare terminal look sits close to "playing Cursor as a game." Undertale's warmth, character, and sprites are what keep it on the game side of that line.
**LEANING (James):** toward the book-ward end of Dial 1 (beautiful typeset narrative, sparing images, dice-and-loot as visual punctuation), with the layout adapting for combat.
**Considered and deprioritized:** map-first (personal preference against exploring via a map); card-based (pulls away from free typing, the core). Voice-and-audio-forward is a *channel* to layer on later (eyes-free play), not a base layout.
**Generated art across all directions:** portraits at character creation and when appearance changes (bread hat included); one illustration per new location plus "moment" images for dramatic rulings; a single locked style prompt for consistency; images cached per scene so revisiting costs nothing.
