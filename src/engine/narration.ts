// Dialogue in the narration (docs/UPDATES.md, "Chat bubbles for dialogue"). The
// DM keeps action and staging in prose and puts each spoken line in its own
// paragraph as <say who="Sereth">Prepare to die.</say>; the story shows those as
// quotes with the speaker's face, name and role. Parsing is forgiving: it works
// on half-written text while a turn streams in, and anything that isn't a
// well-formed tag is shown as prose rather than lost.

// `npc` links a speaker the player only knows by description ("The guard") to
// the character in the state, for their face and role.
export type NarrationPart =
  | { kind: "prose"; text: string }
  | { kind: "speech"; who: string; npc?: string; role?: string; text: string };

const SAY = /<say\s+([^>]*)>([\s\S]*?)(?:<\/say>|$)/g;
const ATTR = /(\w+)\s*=\s*["“]([^"”\n]{1,60})["”]/g;

function attributes(raw: string): Record<string, string> {
  return Object.fromEntries([...raw.matchAll(ATTR)].map((m) => [m[1]!.toLowerCase(), m[2]!.trim()]));
}
// The start of a tag that hasn't finished arriving yet.
const PARTIAL_TAG = /<(?:s(?:a(?:y(?:\s[^>]*)?)?)?|\/(?:s(?:a(?:y)?)?)?)?$/;

function unquote(text: string): string {
  return text.trim().replace(/^["“‘']+|["”’']+$/g, "").trim();
}

export function parseNarration(text: string): NarrationPart[] {
  const parts: NarrationPart[] = [];
  const prose = (t: string) => {
    const clean = t.replace(/<\/say>/g, "").trim();
    if (clean) parts.push({ kind: "prose", text: clean });
  };
  for (const paragraph of text.replace(PARTIAL_TAG, "").split(/\n\s*\n/)) {
    let last = 0;
    for (const m of paragraph.matchAll(SAY)) {
      prose(paragraph.slice(last, m.index));
      const { who, npc, role } = attributes(m[1]!);
      const words = unquote(m[2]!);
      if (words && who) parts.push({ kind: "speech", who, ...(npc && { npc }), ...(role && { role: role.slice(0, 24) }), text: words });
      else prose(words);
      last = m.index! + m[0].length;
    }
    prose(paragraph.slice(last));
  }
  return parts;
}

// The same narration with the tags turned back into ordinary quoted speech, for
// anywhere that shows plain text.
export function plainNarration(text: string): string {
  return parseNarration(text)
    .map((p) => (p.kind === "prose" ? p.text : `${p.who}: “${p.text}”`))
    .join("\n\n");
}
