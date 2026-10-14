# ❓ Open Threads

- Notion: https://app.notion.com/p/3ee2bc887e0581c28880f38d032ab68d
- Fetched: 2026-10-14T14:31:09.388Z
- Last edited: 2026-10-14T14:31:09.388Z

---

Everything undecided, in one place. Each item is also marked OPEN where it lives. When James decides one, mark it there with a status, move it to **Resolved** below with the date, and add a Changelog line.
## Conflicts between documents
*Older docs and later decisions that disagree. Migrated faithfully on both sides; James to rule.*
- [ ] **What is the main hook?** The design doc's leading candidate (LEANING) is "misaligned gods" with a Dwemer-like precursor race, pitched partly as an AI wink. James's playtest notes then steer *away* from the AI-allegory angle, keeping awakening automata only as discovered lore. The October worldbuilding makes dogma the antagonist and gives the mage city an automata keystone. Confirm whether misaligned gods is retired, folded into the automata, or still live. *Note: the keystone sessions add James's decision that "the metaphor is progress, not AI" — keep it literal, let players supply the AI rhyme — and put a Dwemer-style vanished civilization behind the mage city's automata (LEANING). That likely supersedes the AI-wink framing; see Combustion.* **Update (2026-10-07):** the automata are reframed as running on magic *and* mechanism together, with combustion as one extractable component rather than their crux. How magic and mechanism coexist in the automata — and how that squares with magic being an ordinary learnable part of the world — still needs a dedicated pass before the automata delivery is locked. See Combustion.
- [ ] **Classic high fantasy, or its own twist?** An open question in the design doc. The October worldbuilding (regions as civilizations built on one worldview, races as purified human traits, humans-only playable) looks like the answer. Confirm.
- [ ] **Character creation order.** The design doc says creation is light (name, one-line concept, stat spread) with identity drawn out through conversation in the opening. Playtest adds an archetype pick at the start. Probably compatible; confirm the order.
## From the design doc (Sep 2026)
- [ ] Working title?
- [ ] Which exploration option to prototype first, after v1?
- [ ] Should the DM have a named persona the player meets, or stay an invisible narrator?
- [ ] Which model is DM for v1, and what's an acceptable cost per session?
- [ ] The exact main-story hook, the specific god(s) and catastrophe. (Overlaps the hook conflict above.)
## From playtesting (Sep 2026)
- [ ] Player self-image: how players design what their character looks like. V1 remedy proposed: seed from archetype imagery.
- [ ] Combat view: grid/mini-map, generated field-of-view image, or portraits arranged spatially.
- [ ] The main story itself (its shape, opt-in relational gravity, is LOCKED). Hook ideas parked as possible seasons.
## From the abilities taxonomy (Sep 2026)
- [ ] How a generated "Something else" archetype invents and balances entirely new ability domains. (Parked.)
- [ ] How many entries per category hits "rich but not overwhelming"?
- [ ] The proposed category lists themselves are LEANING, waiting on James's reaction.
## From worldbuilding (Oct 2026)
- [x] **⚠️ Canon export for chat sessions — CLAUDE CODE TASK (James, 2026-10-14, do before the next audit pass).** Chat-Claude keeps skipping page reads, so give it the whole canon up front. Claude Code already snapshots this space into the repo's `/design` folder; bundle that snapshot into **one dated markdown file** (every page plus the Canon Ledger rows, page titles and URLs as headings) and hand it to James to upload to the [claude.ai](http://claude.ai) Project "LLM DND" as Project knowledge. Re-export after sessions that change canon. Notion stays the source of truth; chat re-fetches only pages edited since the export date. Open: whether the file survives compaction in practice (test once), and its size against the context window. See Session protocol steps 10–11. **Done 2026-10-14 (Claude Code):** `design/exports/canon-export-2026-10-14.md` in the repo (45 pages + 53 ledger rows, \~200k tokens by a characters ÷ 4 estimate). Rebuild with `node scripts/canon-export.mjs` after refreshing `/design`. Still open: the compaction test, and whether a file that size loads whole or gets searched.
- [ ] **⚠️ Per-playthrough canon memory — NEEDS A CLAUDE CODE CONVERSATION (James, high priority).** The "two-tier canon" pillar's **Rule B** (invented lore must be *persisted and honored* for the rest of a playthrough, never invented-and-forgotten) is the hard engineering problem of the whole game, and the make-or-break for the world holding together past hour six. "Fit the world" is a prompting problem; "remember everything you invented across a long playthrough and never contradict it" is a **memory-architecture** problem. Needs a dedicated design pass with Claude Code: how emergent lore is stored, recalled, and kept non-contradicting. Its design decisions come back to Mechanics. See Pillars → "Two-tier canon."
- [ ] **The secretly sincere elf** (Claude flagged): one or two elves who hide their sincerity like a shameful secret, to keep the elves from flattening into "the evil region." See Elves.
- [ ] **Map the regions** geographically and politically against each other.
- [ ] **Is the small-towns idea the primary thesis?** James is holding it lightly. See Thesis.
- [ ] **Orc food:** build out the feast and the dangerous-beast cuisine.
- [ ] **Dwarf story ideas:** the lost dwarf who finished his life's work (possible party member); the dwarves going extinct from never taking partners.
- [ ] **How the player gets into the thieves' guild.** Claude's pitch (recruited after being noticed picking a pocket) isn't locked.
- [ ] **Invent the delta gambling game** — rules and feel. Re-verify app-store rules closer to ship.
- [ ] **Where the real (non-hazing) rats quest sits:** from a harder tunnel faction, or from your crew later once you're attached. James leans early.
- [ ] **The fake Shaolin monk:** does he become an informant, or is he one of many?
- [ ] **More contempt-based routes to northern respect** (James wants one or two more, like the wall of names).
- [ ] **The north child-rescue sequence** — what it actually looks like.
- [ ] **Does paying the delta debt fix anything,** or does the city let them run it up again?
- [ ] **Two guilds:** how the mercenary guild (the guards in A Loved One's Debt) relates to the thieves' guild (The Emperor's Crown). Are the emperor's compound guards the mercenary guild?
- [ ] **The north keystone's trope risk,** and its touching the elves (James's hesitations; status LEANING).
- [ ] **The papal election** (LEANING, deepened 2026-10-10): the three candidates are now three geopolitical levers on the crown's holy army (bureaucrat = crown's / fanatic = militant against / Daniel = withdrawn), the Daniel figure gained sympathetic vices, and the vice-den was added. Still open: making the reform/withdrawal outcome genuinely *hard* to achieve (never the easy good-guy button); which candidates court the player; the vice-den's exact placement.
- [ ] **The elven court:** succession drama, and how humans tangle with elven royalty (James deferred).
- [ ] **Build a library of quest beats** (the portable templates from Pillars).
- [ ] **Orc daily life:** daily rhythms, child-rearing, organization below the Strongest.
- [ ] **Does the crown float an orc tax in the story?** (James, 2026-10-11) The crown could probably tax the orcs but leaves them alone because it isn't worth it (confusion, enormous military cost, limited yield). An attempt could be a story beat. See <mention-page url="https://app.notion.com/p/3f52bc887e058137b7f8fbcef4db9f6c"/>.
- [ ] **The Exile's Ring:** how a failed removal roll is retried; whether the eagles want something in return; what the exile's flyers are; the part-two lair dungeon. See <mention-page url="https://app.notion.com/p/3ee2bc887e0581fca504dcaaf70e51b0"/>.
- [ ] **Turgeon's role:** the main mage character has a name but no place in the story yet. Candidate: the "certain mage" the player brings the exile's ring to. See <mention-page url="https://app.notion.com/p/3f32bc887e0581d0810fe7fd1ebf4bf3"/>.
- [ ] **Mage voice details:** the meaning of "equiscopy," the behaviour hooks (stress tell, flattery, dismissing commoners), the sample insults, and how often DM annotations appear are all Claude proposals awaiting James. Note: the deadpan annotations give the DM a dry voice of its own, which touches the "named persona or invisible narrator" question above.
## Resolved
- [x] **Is the delta lethal?** (James, 2026-10-13) — organized murder does occur in the delta, but never through the thieves' guild, and it's less prominent than theft or spectacle violence. The world's assassin order still lives with the holy region's killer-monks. See The Delta.
- [x] **Whose voice the Exile's Ring speaks in** — the exile's; the ring has no will of its own (James, 2026-10-05). See <mention-page url="https://app.notion.com/p/3ee2bc887e0581fca504dcaaf70e51b0"/>.
- [x] **Art style for the locked style prompt** — Conan the Barbarian-style vintage comic-strip illustration (James, Oct 2026). See Presentation & Visuals.
- [x] **How dark is the game? / content ceiling + default DM tone** (James, 2026-10-10) — resolved: it's a **mature (17+) game bounded only by store policy** — PG-13 retired; real vice/violence/fear are features that earn the rating. The only hard line is app-store shippability (no explicit sexual content; absolute line against sexualizing minors); a few more store-driven lines may surface and get handled case-by-case. Method is **implication over depiction** (better craft *and* keeps an adult story store-compliant), enforced in the DM prompt. Tone doesn't vary by region — implication carries the delta's darkness too. See <mention-page url="https://app.notion.com/p/3f62bc887e058158979ad7dcd954ef96"/> and the DM note on Mechanics.
