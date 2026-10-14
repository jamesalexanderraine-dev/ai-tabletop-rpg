# Design snapshot (read-only)

A copy of the Notion space **LLM D&D — Game Design** (https://app.notion.com/p/3ee2bc887e058131b6a0d79876f8f8fd), kept because Notion's free plan holds only 7 days of history. **Edit in Notion, never here.** If this folder and Notion disagree, Notion wins.

- `pages/` — one file per Notion page, its body as Notion's enhanced markdown, with the page's URL and edit time at the top.
- `canon-ledger.json` — every Canon Ledger row with all its properties, as returned by the Notion API. `canon-ledger.md` is the same rows as a table.
- `exports/canon-export-<date>.md` — every page plus the ledger bundled into one file for claude.ai Project knowledge (Open Threads, "Canon export for chat sessions").

## Refreshing

1. Fetch every page under the main page and query the Canon Ledger through the Notion MCP; overwrite the files in `pages/` and `canon-ledger.json`. New pages also need a line in `ORDER` in `scripts/canon-export.mjs`.
2. Run `node scripts/canon-export.mjs` (optionally pass a `YYYY-MM-DD` date) to rebuild `canon-ledger.md` and the dated export.
3. Commit.

## Last snapshot

2026-10-14: 45 pages and 53 ledger rows.
