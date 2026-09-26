// Game state (see docs/DESIGN.md, "Game state and rules").
// Code owns the truth: the DM proposes changes through tools (src/engine/tools.ts),
// which validate and apply them here, or return an error the DM can re-narrate.

import { STATS, type CheckResult, type Difficulty, type Stat } from "./dice";

export type Stats = Record<Stat, number>;

export interface Roll extends CheckResult {
  stat: Stat;
  difficulty: Difficulty;
  reason: string;
}

// A visible record of something a tool changed, shown in the story as it happens.
export const CHANGE_KINDS = ["item", "vitals", "npc", "scene", "note"] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];
export interface Change {
  kind: ChangeKind;
  text: string;
}

export interface Turn {
  player: string | null; // null for the DM's opening narration
  narration: string;
  rolls: Roll[];
  changes: Change[];
}

export interface Character {
  name: string | null;
  backstory: string[];
  hp: number;
  maxHp: number;
  xp: number;
  conditions: string[];
}

export interface Item {
  name: string;
  tags: string[];
}

export const ATTITUDES = ["hostile", "unfriendly", "neutral", "friendly", "allied"] as const;
export type Attitude = (typeof ATTITUDES)[number];

export interface Npc {
  name: string;
  attitude: Attitude;
  note: string;
}

export interface Scene {
  name: string;
  description: string;
}

export interface GameState {
  version: 2;
  character: Character;
  stats: Stats;
  inventory: Item[];
  npcs: Npc[];
  flags: Record<string, string>;
  scene: Scene;
  // The DM's rolling "story so far", rewritten every ~10 turns.
  story: { summary: string; turn: number };
  turns: Turn[];
}

export const MAX_ROLLS_PER_TURN = 3;
export const MAX_SITUATIONAL_BONUS = 5;
export const MAX_BACKSTORY_FACTS = 30;
export const MAX_FACT_LENGTH = 240;
export const MAX_NAME_LENGTH = 60;
export const MAX_PLAYER_INPUT_LENGTH = 1000;
export const MAX_TURNS = 400;
export const MAX_ITEMS = 30;
export const MAX_TAGS = 6;
export const MAX_TAG_LENGTH = 24;
export const MAX_NPCS = 30;
export const MAX_FLAGS = 40;
export const MAX_FLAG_KEY_LENGTH = 40;
export const MAX_CONDITIONS = 8;
export const MAX_SCENE_DESCRIPTION = 400;
export const MAX_STORY_SUMMARY = 1500;
export const STORY_SUMMARY_EVERY = 10;
export const STARTING_HP = 10;

// A modest starting spread. Character creation proper arrives with progression.
export const STARTING_STATS: Stats = {
  might: 1,
  agility: 1,
  wits: 2,
  presence: 1,
  spirit: 0,
  luck: 0,
};

export const OPENING_SCENE: Scene = {
  name: "The cells beneath Harrowgate Keep",
  description:
    "A damp stone corridor of iron-doored cells, lit by one guttering torch. Wet straw on the floors. The guard's stool and keys are at the far end.",
};

export const OPENING_NPCS: Npc[] = [
  { name: "Sereth", attitude: "neutral", note: "Sharp-tongued dark elf thief in the cell opposite. Wants out and trades help for help." },
  { name: "Old Tamsin", attitude: "unfriendly", note: "Bored dungeon guard who hums badly. Keeps the cell keys on his belt." },
];

export const OPENING_NARRATION =
  "Cold stone presses against your cheek. You wake in a cell that smells of wet straw and old " +
  "candle smoke, a thin blade of torchlight slipping under the iron door. Somewhere down the " +
  "corridor, a guard is humming badly.\n\n" +
  "In the cell across the passage, a dark elf with a split lip leans against the bars and studies " +
  "you with open curiosity. “Ah. The new one’s awake,” she says. “They dragged you in " +
  "last night, and nobody could agree on what you’d done. So. Who are you, and how did you end " +
  "up down here?”";

export function newGame(): GameState {
  return {
    version: 2,
    character: { name: null, backstory: [], hp: STARTING_HP, maxHp: STARTING_HP, xp: 0, conditions: [] },
    stats: { ...STARTING_STATS },
    inventory: [],
    npcs: OPENING_NPCS.map((n) => ({ ...n })),
    flags: {},
    scene: { ...OPENING_SCENE },
    story: { summary: "", turn: 0 },
    turns: [{ player: null, narration: OPENING_NARRATION, rolls: [], changes: [] }],
  };
}

export type ToolOutcome<T> = { ok: true; value: T } | { ok: false; error: string };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function appendTurn(state: GameState, turn: Turn): GameState {
  return { ...state, turns: [...state.turns, turn].slice(-MAX_TURNS) };
}

export function validatePlayerInput(input: unknown): ToolOutcome<string> {
  if (typeof input !== "string" || !input.trim()) return { ok: false, error: "Type something to do or say." };
  const trimmed = input.trim();
  if (trimmed.length > MAX_PLAYER_INPUT_LENGTH) {
    return { ok: false, error: `Keep it under ${MAX_PLAYER_INPUT_LENGTH} characters.` };
  }
  return { ok: true, value: trimmed };
}

// Until saves move to the server, the browser sends its state with each turn.
// Check its shape before trusting it; returns null if it doesn't fit. Milestone 1
// saves (version 1) are upgraded so games in progress carry over.
export function parseGameState(raw: unknown): GameState | null {
  if (!isRecord(raw)) return null;
  if (raw.version === 1) return parseGameState(upgradeFromV1(raw));
  if (raw.version !== 2) return null;
  const { character: c, stats, inventory, npcs, flags, scene, story, turns } = raw;
  if (!isRecord(c) || !isRecord(stats) || !isRecord(flags) || !isRecord(scene) || !isRecord(story)) return null;
  if (!Array.isArray(inventory) || !Array.isArray(npcs) || !Array.isArray(turns)) return null;

  if (!(c.name === null || isText(c.name, MAX_NAME_LENGTH))) return null;
  if (!isTextList(c.backstory, MAX_BACKSTORY_FACTS, MAX_FACT_LENGTH)) return null;
  if (!isTextList(c.conditions, MAX_CONDITIONS, MAX_TAG_LENGTH)) return null;
  if (!isInt(c.maxHp, 1, 999) || !isInt(c.hp, 0, c.maxHp) || !isInt(c.xp, 0, 1_000_000)) return null;
  // Stats are fixed at the starting spread until progression exists, so ignore
  // whatever the client sent rather than trusting it.
  if (!STATS.every((s) => typeof stats[s] === "number")) return null;

  if (inventory.length > MAX_ITEMS || !inventory.every(isItem)) return null;
  if (npcs.length > MAX_NPCS || !npcs.every(isNpc)) return null;
  const flagEntries = Object.entries(flags);
  if (flagEntries.length > MAX_FLAGS) return null;
  if (!flagEntries.every(([k, v]) => k.length <= MAX_FLAG_KEY_LENGTH && isText(v, MAX_FACT_LENGTH))) return null;
  if (!isText(scene.name, MAX_NAME_LENGTH) || !isText(scene.description, MAX_SCENE_DESCRIPTION)) return null;
  if (!isText(story.summary, MAX_STORY_SUMMARY) || !isInt(story.turn, 0, MAX_TURNS * 100)) return null;

  if (turns.length === 0 || turns.length > MAX_TURNS) return null;
  const parsedTurns: Turn[] = [];
  for (const t of turns) {
    if (!isRecord(t)) return null;
    if (!(t.player === null || isText(t.player, MAX_PLAYER_INPUT_LENGTH))) return null;
    if (!isText(t.narration, 20_000) || !Array.isArray(t.rolls) || !Array.isArray(t.changes)) return null;
    if (t.rolls.length > MAX_ROLLS_PER_TURN || !t.rolls.every(isRoll)) return null;
    if (t.changes.length > 40 || !t.changes.every(isChange)) return null;
    parsedTurns.push({
      player: t.player as string | null,
      narration: t.narration as string,
      rolls: t.rolls as Roll[],
      changes: t.changes as Change[],
    });
  }

  return {
    version: 2,
    character: {
      name: c.name as string | null,
      backstory: c.backstory,
      hp: c.hp as number,
      maxHp: c.maxHp as number,
      xp: c.xp as number,
      conditions: c.conditions,
    },
    stats: { ...STARTING_STATS },
    inventory: inventory as Item[],
    npcs: npcs as Npc[],
    flags: flags as Record<string, string>,
    scene: { name: scene.name as string, description: scene.description as string },
    story: { summary: story.summary as string, turn: story.turn as number },
    turns: parsedTurns,
  };
}

function upgradeFromV1(v1: Record<string, unknown>): Record<string, unknown> {
  const character = isRecord(v1.character) ? v1.character : {};
  const worldFacts = Array.isArray(v1.worldFacts) ? v1.worldFacts : [];
  const turns = Array.isArray(v1.turns) ? v1.turns : [];
  const fresh = newGame();
  return {
    ...fresh,
    character: { ...fresh.character, name: character.name ?? null, backstory: character.backstory ?? [] },
    stats: v1.stats,
    flags: Object.fromEntries(worldFacts.slice(0, MAX_FLAGS).map((fact, i) => [`fact_${i + 1}`, fact])),
    turns: turns.map((t) => (isRecord(t) ? { ...t, changes: [] } : t)),
  };
}

function isText(v: unknown, max: number): v is string {
  return typeof v === "string" && v.length <= max;
}

function isInt(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}

function isTextList(v: unknown, maxItems: number, maxLength: number): v is string[] {
  return Array.isArray(v) && v.length <= maxItems && v.every((s) => isText(s, maxLength));
}

function isItem(v: unknown): v is Item {
  return isRecord(v) && isText(v.name, MAX_NAME_LENGTH) && isTextList(v.tags, MAX_TAGS, MAX_TAG_LENGTH);
}

function isNpc(v: unknown): v is Npc {
  return (
    isRecord(v) &&
    isText(v.name, MAX_NAME_LENGTH) &&
    (ATTITUDES as readonly unknown[]).includes(v.attitude) &&
    isText(v.note, MAX_FACT_LENGTH)
  );
}

function isChange(v: unknown): v is Change {
  return isRecord(v) && (CHANGE_KINDS as readonly unknown[]).includes(v.kind) && isText(v.text, 400);
}

function isRoll(r: unknown): r is Roll {
  return (
    isRecord(r) &&
    (STATS as readonly unknown[]).includes(r.stat) &&
    typeof r.difficulty === "string" &&
    ["easy", "medium", "hard", "heroic"].includes(r.difficulty) &&
    isText(r.reason, MAX_FACT_LENGTH) &&
    ["roll", "statModifier", "situationalBonus", "total", "target"].every((k) => typeof r[k] === "number") &&
    typeof r.success === "boolean" &&
    (r.critical === null || r.critical === "success" || r.critical === "failure")
  );
}

export function describeRoll(roll: Roll): string {
  const mods = roll.statModifier + roll.situationalBonus;
  const sign = mods >= 0 ? "+" : "−";
  const crit = roll.critical === "success" ? " (natural 20)" : roll.critical === "failure" ? " (natural 1)" : "";
  return (
    `${capitalize(roll.stat)} check, ${roll.difficulty} ${roll.target}: rolled ${roll.roll} ${sign} ${Math.abs(mods)} = ` +
    `${roll.total}, ${roll.success ? "success" : "failure"}${crit}`
  );
}

export function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
