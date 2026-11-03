# Skin witch reveal (Art Style Proofs, Round 14)

Round 13's witch looked like she was wearing a face, because the prompt asked for her face "peeling down like a loose mask". This round never shows the face coming off.

- `portrait.scenes.json` made `witch-human.webp`, her human form from the visual bible sheet.
- `reveal.scenes.json` stages the reveal three ways, each sent with that portrait as a reference image (the `references` field in `scripts/art-proof.mjs`). `log.json` has the prompts actually sent.
- Verdict: `shadow-*` (her monstrous shadow on the wall, before the reveal) and `back-*` (the true form unfolding out of a split down her spine, face turned away) work. `shed-*` (her empty skin on the floor) reads as an unconscious old woman, so it's dropped.
- `back-2` and `shed-2` had a black bar down the right edge, trimmed.
