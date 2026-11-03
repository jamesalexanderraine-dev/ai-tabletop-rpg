// Builds one image prompt from the visual bible, so a character, place or region
// is described the same way every time it is drawn. Pure: no network, no file reads.

export interface StyleSheet { prompt: string; framing: string; emptySceneRule: string }
export interface RegionSheet { name: string; look: string; people: string; palette?: string; never: string[] }
export interface CharacterSheet {
  name: string; region: string; body: string; face: string; outfit: string;
  props?: string; trueForm?: string; never: string[];
}
export interface LocationSheet {
  name: string; region: string; look: string; never?: string[];
  /** Indoors: keep the region's palette and dress, drop its landscape. */
  interior?: boolean;
}
export interface VisualBible {
  style: StyleSheet;
  regions: Record<string, RegionSheet>;
  characters: Record<string, CharacterSheet>;
  locations: Record<string, LocationSheet>;
}

export interface ImageRequest {
  /** portrait = one character, location = an empty place, moment = something happening */
  kind: "portrait" | "location" | "moment";
  /** What is happening, written first because the model weighs the opening most. */
  action: string;
  location?: string;
  /** Region to use when there is no location (a portrait). Defaults to the first character's. */
  region?: string;
  characters?: string[];
  /** Characters shown in their true form as well as their human one. */
  revealTrueForm?: string[];
  /** Describe the region's ordinary people too (crowds, passers-by). */
  crowd?: boolean;
  never?: string[];
}

export function composeImagePrompt(bible: VisualBible, req: ImageRequest): string {
  const get = <T>(table: Record<string, T>, id: string, what: string): T => {
    const v = table[id];
    if (!v) throw new Error(`Unknown ${what} "${id}" in the visual bible`);
    return v;
  };
  const chars = (req.characters ?? []).map(id => ({ id, ...get(bible.characters, id, "character") }));
  const place = req.location ? get(bible.locations, req.location, "location") : undefined;
  const regionId = place?.region ?? req.region ?? chars[0]?.region;
  const region = regionId ? get(bible.regions, regionId, "region") : undefined;

  const parts: string[] = [req.action.trim()];
  if (place) parts.push(`Setting: ${place.look}.`);
  if (region) {
    if (!place?.interior) parts.push(`${region.name} look: ${region.look}`);
    if (region.palette) parts.push(`Palette: ${region.palette}`);
    if (req.crowd) parts.push(`People here wear ${region.people}`);
  }
  if (chars.length) {
    const lines = chars.map(c => {
      let line = `- ${c.name}: ${c.body}; ${c.face}; wearing ${c.outfit}`;
      if (c.props) line += `; ${c.props}`;
      if (c.trueForm && req.revealTrueForm?.includes(c.id)) line += `. True form: ${c.trueForm}`;
      return line + ".";
    });
    parts.push(`Characters (draw them exactly like this):\n${lines.join("\n")}`);
  }
  const never = [...new Set([
    ...(place?.never ?? []), ...(region?.never ?? []), ...chars.flatMap(c => c.never), ...(req.never ?? []),
  ])];
  if (never.length) parts.push(`Do not draw: ${never.join(", ")}.`);
  parts.push(`Style: ${bible.style.prompt}`, bible.style.framing);
  if (req.kind === "location") parts.push(bible.style.emptySceneRule);
  return parts.join("\n\n");
}
