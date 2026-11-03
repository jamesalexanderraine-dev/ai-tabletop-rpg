# Design notes

Short playtest notes, newest first. One entry per task: date, what changed, what felt good or bad, what to try next.

## 2026-11-03: Art proofs, rewritten prompts

- Rewrote the eight key-scene prompts against their Round 11 verdicts and ran two takes each (Round 12 of the Art Style Proofs artifact, images in `art-tests/2026-11-03-key-scenes-v2`).
- Good: most fixes landed. The delta is plank and canvas, the shoe is off, the table flies, the plateau stands on a mountain, the chimera is human parts. Explicit negatives and concrete materials worked better than references.
- Bad: borders still slip in (5 of 16), the north's "patched" look stays too tidy, and the vain councillor became a stock wizard.
- Next: fold "lead with the action" and "name what not to draw" into the DM's image-prompt instructions when images are wired in.

## 2026-11-02: Art proofs on eight key scenes

- Ran the locked barbarian comic style on eight lore scenes (delta joust, the emperor, mage city, the orb and the shoe, the elven plateau, the north's great hall, the rooted city, the skin witch). Images in `art-tests/2026-11-02-key-scenes`, verdicts in Round 11 of the Art Style Proofs artifact.
- Good: Pro got every named object into frame, held back saturation for the north's palette, and nothing was refused, even the gore and body horror.
- Bad: actions don't land (the shoe is held, not taken off; the attacking table stands still), and region-specific architecture drifts toward stock fantasy (the delta's canvas fairground became a stone castle town).
- Next: test blunter verbs for moment images, and name what *not* to draw for regions whose look is a twist on a stock one.

## 2026-09-26: Milestone 0 scaffold

- Next.js + TypeScript app with a placeholder page and `/api/health`.
- Rules engine started with the d20 check (d20 + stat modifier + situational bonus vs. easy 8 / medium 12 / hard 16 / heroic 20; natural 20 and 1 always succeed or fail).
- Nothing to playtest yet. Next: Milestone 1, the text-only DM loop.
