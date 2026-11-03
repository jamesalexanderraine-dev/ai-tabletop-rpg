# Key scenes from the visual bible (Art Style Proofs, Round 13)

Same eight scenes, two takes each on `gemini-3-pro-image`, now built by `scripts/art-proof.mjs` from the look sheets in `src/art/visual-bible.json`. Viewable with Round 12 for comparison in the Art Style Proofs artifact (https://claude.ai/artifact/KRSZv6wmMPtb43g2FbdocX).

- `scenes.json`: each scene's action line and which sheets it uses. Rerun with `node scripts/art-proof.mjs art-tests/2026-11-03-key-scenes-v3/scenes.json <outDir> 2`.
- `log.json`: the full prompt actually sent for every take. These predate two later bible fixes (the delta's "made of alligator hide" wording and the `interior` flag).
- `<scene>-<take>.webp`: the images. Borders trimmed on great hall 1 and both skin witch takes; skin witch 1 also split into two comic panels, which a trim can't fix.
