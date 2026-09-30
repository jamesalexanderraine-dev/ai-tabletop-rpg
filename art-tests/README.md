# Art style tests

Image-generation experiments for Milestone 4 (portraits and scene art). Nothing here is used by the game yet.
The full visual history of every round is in the style gallery: https://claude.ai/artifact/KRSZv6wmMPtb43g2FbdocX

## Decisions so far

- **Style: barbarian comic** (1970s-80s Conan and Masters of the Universe). It beat painterly, ink, illuminated, pixel art, glow, a Department of Truth look and Bosch, and it's the most readable at small sizes.
- **Portraits:** face and neck only, cropped at the tips of the shoulders, static. Speaker circles are 21px, so the silhouette and colour carry them.
- **No generation during play.** Locations and NPC portraits come from a pre-made library, with 2 or 3 deliberately different takes per location (time of day, weather, angle). The engine remembers which take a place uses, so a revisit looks the same. On-the-fly generation is reserved for the player's own portrait, once per character.
- ASCII art is shelved for now.

## Folders

- `tools/imagegen.py`: the locked prompts (style, framing, scene rule, portrait template) and a runner that times each call and records tokens.
- `tools/cleanup.py`: trims borders and comic-panel gutters, re-crops scenes to 16:9, zooms portraits slightly, and flags an image that is a small panel on a page so it can be regenerated.
- `2026-09-30-barbarian-picks/`: the cleaned round 8 set (5 portraits, 7 locations, 1 moment), all on `gemini-3-pro-image`.
- `2026-09-30-flash-vs-pro/`: the same 4 characters and 4 locations on both image models, with `results.json` (seconds, tokens and cleanup result per image).

## Flash vs Pro (2026-09-30)

| | gemini-3-pro-image | gemini-3.1-flash-image |
|---|---|---|
| Cost per 1K image | about $0.134 | about $0.067 |
| Seconds per image (8 at once) | 20.1 average (17.7 to 27.5) | 9.6 average (9.1 to 10.5) |
| Needed a border trim | 1 of 8 | 4 of 8 |
| Unrequested people in scenes | 0 of 4 | 0 of 4 |

Both models used 1,120 image tokens per picture, which matches the published per-image prices. Pro also spends about 200 to 300 "thinking" tokens per image.

What it looked like:
- Flash holds the style. Its locations are darker and grittier, with more ink hatching, closer to a vintage comic. Pro is more saturated, with more dramatic lighting and tighter portrait crops.
- Pro follows character details better: Flash gave the dark elf brown skin and ordinary eyes instead of grey skin and pale eyes. Neither innkeeper reads clearly as a halfling (Pro drew a bearded man, Flash a woman).
- The cleanup script fixed every border on both models.

## Running it

```sh
pip install pillow
GEMINI_API_KEY=... python3 art-tests/tools/imagegen.py art-tests/<date>-<name> gemini-3-pro-image gemini-3.1-flash-image
```

The key needs a billed Google AI Studio project: the free tier allows zero image generations.
