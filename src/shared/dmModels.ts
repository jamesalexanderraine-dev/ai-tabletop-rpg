// The Dungeon Master models a player can switch between. Shared by the browser
// (the picker on the sheet) and the server, which only runs a turn on one of these.

export const DM_MODELS = [
  { id: "claude-opus-5-5", name: "Opus 5.5", blurb: "Deeper judgment, slower replies" },
  { id: "claude-sonnet-5-5", name: "Sonnet 5.5", blurb: "Quicker replies, half the cost" },
] as const;

export type DmModelId = (typeof DM_MODELS)[number]["id"];

export const DEFAULT_DM_MODEL: DmModelId = "claude-opus-5-5";

export function isDmModelId(value: unknown): value is DmModelId {
  return DM_MODELS.some((m) => m.id === value);
}
