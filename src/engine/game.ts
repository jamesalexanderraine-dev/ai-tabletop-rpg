// Game state (see docs/DESIGN.md, "Game state and rules").
// Code owns the truth: the DM proposes changes through tools (src/engine/tools.ts),
// which validate and apply them here, or return an error the DM can re-narrate.

import { STATS, type CheckResult, type Difficulty, type Stat } from "./dice";
import { parseCustomArchetype } from "./customArchetype";
import {
  abilitiesAt,
  abilityFor,
  ARCHETYPE_IDS,
  archetypeInfo,
  archetypeOf,
  levelForXp,
  levelTraitsAt,
  MAX_SKILL_RANK,
  MAX_STAT,
  MAX_TRAITS,
  maxEnergyAt,
  maxHpAt,
  skillInfo,
  skillPointsAt,
  STARTING_SKILL_POINTS,
  statRaisesAt,
  type Archetype,
  type ArchetypeInfo,
  type BuiltInArchetype,
  type CustomArchetype,
  type HasArchetype,
} from "./progression";

export type Stats = Record<Stat, number>;

export interface Roll extends CheckResult {
  stat: Stat;
  skill: string | null; // a trained skill adds its rank to the roll
  skillBonus: number;
  difficulty: Difficulty;
  reason: string;
}

// A visible record of something a tool changed, shown in the story as it happens.
export const CHANGE_KINDS = ["item", "vitals", "npc", "scene", "spell", "trait", "note"] as const;
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
  // Chips the player attached in the composer: an ability (by id) the engine
  // applied up front, and items from their pack they're using.
  ability?: string;
  items?: string[];
}

export const MAX_ITEM_CHIPS = 3;

export interface Trait {
  name: string;
  upside: string;
  downside: string;
  source: "level" | "story"; // picked at level-up, or granted by the DM
}

export interface Character {
  name: string | null;
  backstory: string[];
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  archetype: Archetype;
  // The whole kit of a "Something else" archetype; only when archetype is "custom".
  custom?: CustomArchetype;
  // MP for magic users, stamina for everyone else (see archetypeOf().pool).
  energy: number;
  maxEnergy: number;
  conditions: string[];
  statRaises: Partial<Record<Stat, number>>;
  skills: Record<string, number>; // skill id -> rank
  abilities: string[]; // ability ids: spells for mages
  traits: Trait[];
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
  // Who they are to the player, in a word or two ("Cellmate", "Innkeeper"),
  // shown beside their name when they speak. Missing on older saves.
  role?: string;
}

export const MAX_ROLE_LENGTH = 24;

export interface Scene {
  name: string;
  description: string;
}

export interface GameState {
  version: 4;
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
export const STARTING_HP = maxHpAt(1);

export const OPENING_SCENE: Scene = {
  name: "The cells beneath Harrowgate Keep",
  description:
    "A damp stone corridor of iron-doored cells, lit by one guttering torch. Wet straw on the floors. The guard's stool and keys are at the far end.",
};

export const OPENING_NPCS: Npc[] = [
  { name: "Sereth", role: "Cellmate", attitude: "neutral", note: "Sharp-tongued dark elf thief in the cell opposite. Wants out and trades help for help." },
  { name: "Old Tamsin", role: "Jailer", attitude: "unfriendly", note: "Bored dungeon guard who hums badly. Keeps the cell keys on his belt." },
];

// The same prison for everyone, with one line that shows each archetype what it
// could do here (docs/UPDATES.md: "same prison, different opening move").
export function openingNarration(info: ArchetypeInfo): string {
  return (
    "Cold stone presses against your cheek. You wake in a cell that smells of wet straw and old " +
    "candle smoke, a thin blade of torchlight slipping under the iron door. Somewhere down the " +
    `corridor, a guard is humming badly. ${info.openingHook}\n\n` +
    OPENING_QUESTION
  );
}

// Sereth speaks in a bubble (see narration.ts); the player doesn't know her name yet.
const OPENING_QUESTION =
  "In the cell across the passage, a dark elf with a split lip leans against the bars and studies " +
  "you with open curiosity.\n\n" +
  '<say who="The dark elf" npc="Sereth">Ah. The new one’s awake. They dragged you in last night, and nobody could ' +
  "agree on what you’d done. So. Who are you, and how did you end up down here?</say>";

// A new game for one of the three archetypes, or a generated one ("Something else").
export function newGame(choice: BuiltInArchetype | CustomArchetype): GameState {
  const who: HasArchetype = typeof choice === "string" ? { archetype: choice } : { archetype: "custom", custom: choice };
  const info = archetypeOf(who);
  return {
    version: 4,
    character: {
      name: null,
      backstory: [],
      level: 1,
      xp: 0,
      hp: STARTING_HP,
      maxHp: STARTING_HP,
      ...who,
      energy: maxEnergyAt(1),
      maxEnergy: maxEnergyAt(1),
      conditions: [],
      statRaises: {},
      skills: { ...info.skills },
      abilities: [info.signature],
      traits: [],
    },
    stats: statsFor(who, {}),
    inventory: [],
    npcs: OPENING_NPCS.map((n) => ({ ...n })),
    flags: {},
    scene: { ...OPENING_SCENE },
    story: { summary: "", turn: 0 },
    turns: [{ player: null, narration: openingNarration(info), rolls: [], changes: [] }],
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
// Check its shape and that the build is one the rules allow before trusting it;
// returns null if it doesn't fit. Older saves are upgraded so games carry over.
export function parseGameState(raw: unknown): GameState | null {
  if (!isRecord(raw)) return null;
  if (raw.version === 1) return parseGameState(upgradeFromV1(raw));
  if (raw.version === 2) return parseGameState(upgradeFromV2(raw));
  if (raw.version === 3) return parseGameState(upgradeFromV3(raw));
  if (raw.version !== 4) return null;
  const { character: c, stats, inventory, npcs, flags, scene, story, turns } = raw;
  if (!isRecord(c) || !isRecord(stats) || !isRecord(flags) || !isRecord(scene) || !isRecord(story)) return null;
  if (!Array.isArray(inventory) || !Array.isArray(npcs) || !Array.isArray(turns)) return null;

  if (!(c.name === null || isText(c.name, MAX_NAME_LENGTH))) return null;
  if (!isTextList(c.backstory, MAX_BACKSTORY_FACTS, MAX_FACT_LENGTH)) return null;
  if (!isTextList(c.conditions, MAX_CONDITIONS, MAX_TAG_LENGTH)) return null;
  if (!isInt(c.xp, 0, 1_000_000) || !isInt(c.level, 1, levelForXp(c.xp))) return null;
  const level = c.level;
  if (c.maxHp !== maxHpAt(level) || !isInt(c.hp, 0, c.maxHp)) return null;
  let who: HasArchetype;
  if (c.archetype === "custom") {
    // A generated archetype is held to the same budget every time it loads.
    const custom = parseCustomArchetype(c.custom);
    if (!custom.ok) return null;
    who = { archetype: "custom", custom: custom.value };
  } else if ((ARCHETYPE_IDS as readonly unknown[]).includes(c.archetype)) {
    who = { archetype: c.archetype as BuiltInArchetype };
  } else {
    return null;
  }
  if (c.maxEnergy !== maxEnergyAt(level) || !isInt(c.energy, 0, c.maxEnergy)) return null;
  const build = parseBuild(c, level, who);
  if (!build) return null;
  // Stats are derived from the archetype's starting spread plus level-up raises;
  // whatever the client sent for them is ignored.
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
    if (!(t.ability === undefined || isText(t.ability, MAX_NAME_LENGTH))) return null;
    if (!(t.items === undefined || isTextList(t.items, MAX_ITEM_CHIPS, MAX_NAME_LENGTH))) return null;
    parsedTurns.push({
      player: t.player as string | null,
      narration: t.narration as string,
      rolls: t.rolls.map((r: Roll) => ({ ...r, skill: r.skill ?? null, skillBonus: r.skillBonus ?? 0 })),
      changes: t.changes as Change[],
      ...(t.ability !== undefined && { ability: t.ability as string }),
      ...(t.items !== undefined && { items: t.items as string[] }),
    });
  }

  return {
    version: 4,
    character: {
      name: c.name as string | null,
      backstory: c.backstory,
      level,
      xp: c.xp,
      hp: c.hp,
      maxHp: c.maxHp,
      ...who,
      energy: c.energy,
      maxEnergy: c.maxEnergy,
      conditions: c.conditions,
      ...build,
    },
    stats: statsFor(who, build.statRaises),
    inventory: inventory as Item[],
    npcs: npcs as Npc[],
    flags: flags as Record<string, string>,
    scene: { name: scene.name as string, description: scene.description as string },
    story: { summary: story.summary as string, turn: story.turn as number },
    turns: parsedTurns,
  };
}

export function statsFor(who: HasArchetype, raises: Partial<Record<Stat, number>>): Stats {
  const base = archetypeOf(who).stats;
  return Object.fromEntries(STATS.map((s) => [s, base[s] + (raises[s] ?? 0)])) as Stats;
}

type Build = Pick<Character, "statRaises" | "skills" | "abilities" | "traits">;

// Checks the skill ranks, abilities, stat raises and traits are a legal build for
// the archetype and level.
function parseBuild(c: Record<string, unknown>, level: number, who: HasArchetype): Build | null {
  const { statRaises, skills, abilities, traits } = c;
  if (!isRecord(statRaises) || !isRecord(skills) || !Array.isArray(abilities) || !Array.isArray(traits)) return null;
  const base = archetypeOf(who).stats;

  let raises = 0;
  for (const [stat, n] of Object.entries(statRaises)) {
    if (!(STATS as readonly string[]).includes(stat) || !isInt(n, 0, MAX_STAT)) return null;
    if (base[stat as Stat] + n > MAX_STAT) return null;
    raises += n;
  }
  if (raises > statRaisesAt(level)) return null;

  let points = 0;
  for (const [id, rank] of Object.entries(skills)) {
    if (!skillInfo(id) || !isInt(rank, 0, MAX_SKILL_RANK)) return null;
    points += rank;
  }
  if (points > STARTING_SKILL_POINTS + skillPointsAt(level)) return null;

  if (abilities.length > abilitiesAt(level) || new Set(abilities).size !== abilities.length) return null;
  const fits = (id: unknown) => {
    const a = typeof id === "string" ? abilityFor(who, id) : undefined;
    return !!a && a.level <= level;
  };
  if (!abilities.every(fits)) return null;

  if (traits.length > MAX_TRAITS || !traits.every(isTrait)) return null;
  if (traits.filter((t) => t.source === "level").length > levelTraitsAt(level)) return null;

  return {
    statRaises: statRaises as Partial<Record<Stat, number>>,
    skills: skills as Record<string, number>,
    abilities: abilities as string[],
    traits: traits as Trait[],
  };
}

function isTrait(v: unknown): v is Trait {
  return (
    isRecord(v) &&
    isText(v.name, MAX_NAME_LENGTH) &&
    isText(v.upside, MAX_FACT_LENGTH) &&
    isText(v.downside, MAX_FACT_LENGTH) &&
    (v.source === "level" || v.source === "story")
  );
}

// Milestone 3 saves (before archetypes) become mages: they already had spells.
// The mage's signature spell is added, MP becomes the full pool, and anything the
// new starting spread would push past the limits is trimmed rather than lost.
function upgradeFromV3(v3: Record<string, unknown>): Record<string, unknown> {
  const c = isRecord(v3.character) ? v3.character : {};
  const mage = archetypeInfo("mage");
  const level = typeof c.level === "number" ? c.level : 1;
  const spells = Array.isArray(c.spells) ? c.spells.filter((id): id is string => typeof id === "string") : [];
  const abilities = [...new Set([mage.signature, ...spells])].slice(0, abilitiesAt(level));
  const skills: Record<string, number> = isRecord(c.skills) ? { ...(c.skills as Record<string, number>) } : {};
  for (const [id, rank] of Object.entries(mage.skills)) skills[id] = Math.min(MAX_SKILL_RANK, (skills[id] ?? 0) + rank);
  const raises: Partial<Record<Stat, number>> = isRecord(c.statRaises) ? { ...(c.statRaises as Record<Stat, number>) } : {};
  for (const stat of STATS) {
    if (raises[stat]) raises[stat] = Math.max(0, Math.min(raises[stat]!, MAX_STAT - mage.stats[stat]));
  }
  const { mp: _mp, maxMp: _maxMp, spells: _spells, ...rest } = c;
  return {
    ...v3,
    version: 4,
    character: {
      ...rest,
      archetype: "mage",
      energy: maxEnergyAt(level),
      maxEnergy: maxEnergyAt(level),
      abilities,
      skills,
      statRaises: raises,
    },
  };
}

// Milestone 2 saves: start the progression fields at level 1. XP already earned
// counts, so a long game may have a level-up waiting.
function upgradeFromV2(v2: Record<string, unknown>): Record<string, unknown> {
  const c = isRecord(v2.character) ? v2.character : {};
  const fresh = newGame("mage").character;
  return {
    ...v2,
    version: 3,
    character: {
      ...fresh,
      ...c,
      level: 1,
      maxHp: fresh.maxHp,
      hp: typeof c.hp === "number" ? Math.min(c.hp, fresh.maxHp) : fresh.hp,
      mp: 0,
      maxMp: 0,
      statRaises: {},
      skills: {},
      spells: [],
      traits: [],
      archetype: undefined,
      energy: undefined,
      maxEnergy: undefined,
      abilities: undefined,
    },
  };
}

function upgradeFromV1(v1: Record<string, unknown>): Record<string, unknown> {
  const character = isRecord(v1.character) ? v1.character : {};
  const worldFacts = Array.isArray(v1.worldFacts) ? v1.worldFacts : [];
  const turns = Array.isArray(v1.turns) ? v1.turns : [];
  const fresh = newGame("mage");
  return {
    ...fresh,
    version: 2,
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
    isText(v.note, MAX_FACT_LENGTH) &&
    (v.role === undefined || isText(v.role, MAX_ROLE_LENGTH))
  );
}

function isChange(v: unknown): v is Change {
  return isRecord(v) && (CHANGE_KINDS as readonly unknown[]).includes(v.kind) && isText(v.text, 400);
}

function isRoll(r: unknown): r is Roll {
  return (
    isRecord(r) &&
    (STATS as readonly unknown[]).includes(r.stat) &&
    (r.skill === undefined || r.skill === null || (typeof r.skill === "string" && !!skillInfo(r.skill))) &&
    (r.skillBonus === undefined || isInt(r.skillBonus, 0, MAX_SKILL_RANK)) &&
    typeof r.difficulty === "string" &&
    ["easy", "medium", "hard", "heroic"].includes(r.difficulty) &&
    isText(r.reason, MAX_FACT_LENGTH) &&
    ["roll", "statModifier", "situationalBonus", "total", "target"].every((k) => typeof r[k] === "number") &&
    typeof r.success === "boolean" &&
    (r.critical === null || r.critical === "success" || r.critical === "failure")
  );
}

export function describeRoll(roll: Roll): string {
  const mods = roll.statModifier + roll.skillBonus + roll.situationalBonus;
  const sign = mods >= 0 ? "+" : "−";
  const crit = roll.critical === "success" ? " (natural 20)" : roll.critical === "failure" ? " (natural 1)" : "";
  return (
    `${capitalize(roll.stat)}${roll.skill ? ` (${skillInfo(roll.skill)?.name ?? roll.skill})` : ""} check, ${roll.difficulty} ${roll.target}: rolled ${roll.roll} ${sign} ${Math.abs(mods)} = ` +
    `${roll.total}, ${roll.success ? "success" : "failure"}${crit}`
  );
}

export function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// What the "continue a game" list shows, without loading the whole save.
export interface GameSummary {
  id: string;
  name: string | null;
  archetype: Archetype;
  archetypeName?: string; // missing from summaries saved before generated archetypes
  level: number;
  scene: string;
  turns: number;
  updatedAt: number; // ms since epoch
}

export function summarizeGame(id: string, state: GameState, updatedAt: number): GameSummary {
  return {
    id,
    name: state.character.name,
    archetype: state.character.archetype,
    archetypeName: archetypeOf(state.character).name,
    level: state.character.level,
    scene: state.scene.name,
    turns: state.turns.length,
    updatedAt,
  };
}
