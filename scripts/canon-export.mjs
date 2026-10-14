// Bundles the /design snapshot of the Notion space into one dated markdown
// file for claude.ai Project knowledge, and renders the Canon Ledger as a
// readable table.
//
// Usage: node scripts/canon-export.mjs [YYYY-MM-DD]
// Reads:  design/pages/*.md, design/canon-ledger.json
// Writes: design/canon-ledger.md, design/exports/canon-export-<date>.md

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const designDir = join(root, "design");
const pagesDir = join(designDir, "pages");
const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);

// Notion hierarchy, in reading order. Depth 0 is a direct child of the main page.
const ORDER = [
  ["main", -1],
  ["changelog", 0],
  ["index-and-map", 0],
  ["opening-state", 0],
  ["open-threads", 0],
  ["content-standard", 0],
  ["vision", 0],
  ["thesis", 0],
  ["pillars", 0],
  ["references", 0],
  ["world", 0],
  ["races", 1],
  ["orcs", 2],
  ["elves", 2],
  ["dwarves", 2],
  ["regions", 1],
  ["the-delta", 2],
  ["the-north", 2],
  ["holy-region", 2],
  ["mage-city", 2],
  ["mage-voice", 3],
  ["orc-badlands", 2],
  ["dwarven-mountains", 2],
  ["small-towns", 2],
  ["elven-court", 2],
  ["honest-god-and-witchcraft", 2],
  ["economy-and-mobility", 1],
  ["conspiracies", 1],
  ["comedy", 1],
  ["story", 0],
  ["the-emperors-crown", 1],
  ["the-hoarded-fountain", 1],
  ["the-papal-election", 1],
  ["combustion", 1],
  ["the-da-vinci-dwarf", 1],
  ["the-north-rebellion", 1],
  ["a-loved-ones-debt", 1],
  ["orc-quests", 1],
  ["the-oracle-orb", 1],
  ["mechanics", 0],
  ["feedback-log", 1],
  ["playtest-notes-sep-2026", 1],
  ["presentation-and-visuals", 1],
  ["architecture-and-build-plan", 1],
  ["abilities-and-spells", 1],
];

const LEDGER_URL = "https://app.notion.com/p/35304918bbf94f3baf37bab69020ea41";

function parsePage(slug) {
  const raw = readFileSync(join(pagesDir, `${slug}.md`), "utf8");
  const [head, ...rest] = raw.split("\n---\n");
  const field = (name) => head.match(new RegExp(`^- ${name}: (.*)$`, "m"))?.[1] ?? "";
  return {
    slug,
    title: head.match(/^# (.*)$/m)[1],
    url: field("Notion"),
    edited: field("Last edited"),
    body: rest.join("\n---\n").trim(),
  };
}

const pages = ORDER.map(([slug, depth]) => ({ ...parsePage(slug), depth }));

// Strips the leading emoji so links read "The Delta", not "🎰 The Delta".
const plainTitle = (t) => t.replace(/^\P{L}+/u, "").trim();
const titleById = new Map();
for (const p of pages) titleById.set(p.url.split("/p/")[1], plainTitle(p.title));
titleById.set(LEDGER_URL.split("/p/")[1], "Canon Ledger");

function linkFor(url, text) {
  const id = url.split("/p/")[1]?.slice(0, 32);
  return `[${text || titleById.get(id) || url}](${url})`;
}

// Converts Notion's enhanced-markdown tags into plain markdown a chat model
// reads cheaply. The /design snapshot keeps the raw form.
function toMarkdown(body) {
  const out = [];
  let inCallout = false;
  for (let line of body.split("\n")) {
    const open = line.match(/^<callout(?: icon="([^"]*)")?[^>]*>$/);
    if (open) {
      inCallout = true;
      const icon = open[1] && open[1] !== "\\" ? `${open[1]} ` : "";
      out.push(`> ${icon}`.trimEnd());
      continue;
    }
    if (line === "</callout>") {
      inCallout = false;
      out.push("");
      continue;
    }
    if (line === "<empty-block/>") continue;
    line = line
      .replace(/<mention-(?:page|database) url="([^"]+)"\/>/g, (_, u) => linkFor(u))
      .replace(/<mention-(?:page|database) url="([^"]+)">([^<]*)<\/mention-(?:page|database)>/g, (_, u, t) => linkFor(u, t))
      .replace(/^<page url="([^"]+)">([^<]*)<\/page>$/, (_, u, t) => `- Child page: ${linkFor(u, t)}`)
      .replace(/^<database url="([^"]+)"[^>]*>([^<]*)<\/database>$/, (_, u, t) => `- Child database: ${linkFor(u, t)}`)
      .replace(/\\([~[\]$*])/g, "$1");
    if (inCallout) line = `> ${line.replace(/^\t/, "")}`.trimEnd();
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ---- Canon Ledger ----
const ledger = JSON.parse(readFileSync(join(designDir, "canon-ledger.json"), "utf8"));
const cell = (v) => String(v ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const entities = (v) => (v ? JSON.parse(v).join(", ") : "");
const LEDGER_COLUMNS = ["Fact", "Kind", "Status", "Time scope", "Entities", "Attribution", "Source page", "Notes", "Last verified", "Created", "Row"];
const ledgerRows = ledger.rows.map((r) => [
  r.Fact,
  r.Kind,
  r.Status,
  r["Time scope"],
  entities(r.Entities),
  r.Attribution,
  r["Source page"] ? linkFor(r["Source page"]) : "",
  r.Notes,
  r["date:Last verified:start"],
  r.createdTime?.slice(0, 10),
  r.url,
]);
const ledgerTable = [
  `| ${LEDGER_COLUMNS.join(" | ")} |`,
  `| ${LEDGER_COLUMNS.map(() => "---").join(" | ")} |`,
  ...ledgerRows.map((row) => `| ${row.map(cell).join(" | ")} |`),
].join("\n");

const ledgerIntro = `The fact list and the authority on canon: one short fact per row. ${ledger.rows.length} rows, fetched ${ledger.fetched}. Kind "Constraint (never)" rows are hard rules. Time scope says whether a fact holds always, at the opening, only after a pending story event, or per playthrough.`;

writeFileSync(
  join(designDir, "canon-ledger.md"),
  `# Canon Ledger\n\n- Notion: ${LEDGER_URL}\n- Fetched: ${ledger.fetched}\n\n---\n\n${ledgerIntro}\n\n${ledgerTable}\n`,
);

// ---- Export bundle ----
const toc = pages
  .map((p) => `${"  ".repeat(Math.max(p.depth + 1, 0))}- ${linkFor(p.url, plainTitle(p.title))}`)
  .join("\n");

const preamble = `# LLM D&D — Canon export, ${date}

Every page of the Notion space **LLM D&D — Game Design** plus every row of the Canon Ledger, bundled for claude.ai Project knowledge. Each page starts with a heading carrying its title and Notion URL, then its last-edited time.

**How to use this file (Session protocol, steps 2 and 11):**
- **Notion is the source of truth; this is a dated copy.** It reflects the space as of ${date}. Any page edited after that date must be re-fetched before you rely on it: check the Changelog for entries after ${date}.
- Reading a page here counts as a read for the "Read:" line: cite it as "canon export ${date}" plus the page title.
- Statuses: LOCKED (build against it), LEANING (build flexibly), OPEN (don't assume), REVERSED (history only). Only James can lock anything.

## Contents
${toc}
  - ${linkFor(LEDGER_URL, "Canon Ledger")} (${ledger.rows.length} rows, at the end)
`;

const sections = pages.map((p) => {
  const path = `Last edited ${p.edited.slice(0, 10)}`;
  return `# ${p.title} — ${p.url}\n\n*${path}*\n\n${toMarkdown(p.body)}`;
});

const ledgerSection = `# Canon Ledger — ${LEDGER_URL}\n\n${ledgerIntro}\n\n${ledgerTable}`;

const bundle = [preamble, ...sections, ledgerSection].join("\n\n---\n\n") + "\n";
const exportsDir = join(designDir, "exports");
if (!existsSync(exportsDir)) mkdirSync(exportsDir);
const outPath = join(exportsDir, `canon-export-${date}.md`);
writeFileSync(outPath, bundle);

const words = bundle.split(/\s+/).filter(Boolean).length;
console.log(`${outPath}`);
console.log(`${pages.length} pages, ${ledger.rows.length} ledger rows`);
console.log(`${bundle.length} characters, ${words} words, ~${Math.round(bundle.length / 4).toLocaleString()} tokens (chars / 4)`);
