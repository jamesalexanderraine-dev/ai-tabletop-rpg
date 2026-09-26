// Game state for the Milestone 1 DM loop (see docs/DESIGN.md, "Game state and rules").
// Code owns the truth: the DM proposes rolls and memories through tools, and these
// functions validate and apply them, or return an error the DM can re-narrate.

import { DIFFICULTY, rollCheck, STATS, type CheckResult, type Difficulty, type Rng, type Stat } from "./dice";

export type Stats = Record<Stat, number>;

export interface Roll extends CheckResult {
  stat: Stat;
  difficulty: Difficulty;
  reason: string;
}

export interface Turn {
  player: string | null; // null for the DM's opening narration
  narration: string;
  rolls: Roll[];
}

export interface Character {
  name: string | null;
  backstory: string[];
}

export interface GameState {
  version: 1;
  character: Character;
  stats: Stats;
  worldFacts: string[];
  turns: Turn[];
}

export const MAX_ROLLS_PER_TURN = 3;
export const MAX_SITUATIONAL_BONUS = 5;
export const MAX_BACKSTORY_FACTS = 30;
export const MAX_WORLD_FACTS = 40;
export const MAX_FACT_LENGTH = 240;
export const MAX_NAME_LENGTH = 60;
export const MAX_PLAYER_INPUT_LENGTH = 1000;
export const MAX_TURNS = 400;

// A modest starting spread. Character creation proper arrives with progression.
export const STARTING_STATS: Stats = {
  might: 1,
  agility: 1,
  wits: 2,
  presence: 1,
  spirit: 0,
  luck: 0,
};

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
    version: 1,
    character: { name: null, backstory: [] },
    stats: { ...STARTING_STATS },
    worldFacts: [],
    turns: [{ player: null, narration: OPENING_NARRATION, rolls: [] }],
  };
}

export type ToolOutcome<T> = { ok: true; value: T } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStat(value: unknown): value is Stat {
  return typeof value === "string" && (STATS as readonly string[]).includes(value);
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && Object.hasOwn(DIFFICULTY, value);
}

// Validates a roll_check proposal and rolls it. `rollsSoFar` is how many checks this
// turn has already made, so one turn can't turn into a dice storm.
export function requestCheck(
  state: GameState,
  proposal: unknown,
  rollsSoFar: number,
  rng: Rng = Math.random,
): ToolOutcome<Roll> {
  if (rollsSoFar >= MAX_ROLLS_PER_TURN) {
    return fail(`Only ${MAX_ROLLS_PER_TURN} rolls are allowed per turn. Narrate with the results you have.`);
  }
  if (!isRecord(proposal)) return fail("roll_check needs an object with stat, difficulty and reason.");
  const { stat, difficulty, reason } = proposal;
  const bonus = proposal.situational_bonus ?? 0;
  if (!isStat(stat)) return fail(`Unknown stat "${String(stat)}". Use one of: ${STATS.join(", ")}.`);
  if (!isDifficulty(difficulty)) {
    return fail(`Unknown difficulty "${String(difficulty)}". Use one of: ${Object.keys(DIFFICULTY).join(", ")}.`);
  }
  if (typeof bonus !== "number" || !Number.isInteger(bonus) || Math.abs(bonus) > MAX_SITUATIONAL_BONUS) {
    return fail(`situational_bonus must be a whole number from -${MAX_SITUATIONAL_BONUS} to +${MAX_SITUATIONAL_BONUS}.`);
  }
  if (typeof reason !== "string" || !reason.trim()) return fail("roll_check needs a short reason.");

  const result = rollCheck({ statModifier: state.stats[stat], situationalBonus: bonus, difficulty }, rng);
  return {
    ok: true,
    value: { ...result, stat, difficulty, reason: reason.trim().slice(0, MAX_FACT_LENGTH) },
  };
}

export const MEMORY_KINDS = ["name", "backstory", "world"] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

// Validates a `remember` proposal and returns the updated state.
export function remember(state: GameState, proposal: unknown): ToolOutcome<GameState> {
  if (!isRecord(proposal)) return fail("remember needs an object with about and text.");
  const { about, text } = proposal;
  if (typeof about !== "string" || !(MEMORY_KINDS as readonly string[]).includes(about)) {
    return fail(`"about" must be one of: ${MEMORY_KINDS.join(", ")}.`);
  }
  if (typeof text !== "string" || !text.trim()) return fail("remember needs non-empty text.");
  const clean = text.trim().replace(/\s+/g, " ");

  if (about === "name") {
    if (clean.length > MAX_NAME_LENGTH) return fail(`Names can be at most ${MAX_NAME_LENGTH} characters.`);
    return { ok: true, value: { ...state, character: { ...state.character, name: clean } } };
  }
  if (clean.length > MAX_FACT_LENGTH) return fail(`Keep each fact under ${MAX_FACT_LENGTH} characters.`);
  if (about === "backstory") {
    if (state.character.backstory.length >= MAX_BACKSTORY_FACTS) {
      return fail("The backstory is full for now. Skip facts that are already covered.");
    }
    const backstory = [...state.character.backstory, clean];
    return { ok: true, value: { ...state, character: { ...state.character, backstory } } };
  }
  if (state.worldFacts.length >= MAX_WORLD_FACTS) {
    return fail("World memory is full for now. Only record facts that will matter later.");
  }
  return { ok: true, value: { ...state, worldFacts: [...state.worldFacts, clean] } };
}

export function appendTurn(state: GameState, turn: Turn): GameState {
  return { ...state, turns: [...state.turns, turn].slice(-MAX_TURNS) };
}

export function validatePlayerInput(input: unknown): ToolOutcome<string> {
  if (typeof input !== "string" || !input.trim()) return fail("Type something to do or say.");
  const trimmed = input.trim();
  if (trimmed.length > MAX_PLAYER_INPUT_LENGTH) {
    return fail(`Keep it under ${MAX_PLAYER_INPUT_LENGTH} characters.`);
  }
  return { ok: true, value: trimmed };
}

// Until saves move to the server (Milestone 2), the browser sends its state with
// each turn. Check its shape before trusting it; returns null if it doesn't fit.
export function parseGameState(raw: unknown): GameState | null {
  if (!isRecord(raw) || raw.version !== 1) return null;
  const { character, stats, worldFacts, turns } = raw;
  if (!isRecord(character) || !isRecord(stats) || !Array.isArray(turns) || !Array.isArray(worldFacts)) return null;

  const isShortString = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
  const isFactList = (v: unknown, max: number): v is string[] =>
    Array.isArray(v) && v.length <= max && v.every((f) => isShortString(f, MAX_FACT_LENGTH));

  if (!(character.name === null || isShortString(character.name, MAX_NAME_LENGTH))) return null;
  if (!isFactList(character.backstory, MAX_BACKSTORY_FACTS)) return null;
  if (!isFactList(worldFacts, MAX_WORLD_FACTS)) return null;
  // Stats are fixed at the starting spread until progression exists, so ignore
  // whatever the client sent rather than trusting it.
  if (!STATS.every((s) => typeof stats[s] === "number")) return null;
  if (turns.length === 0 || turns.length > MAX_TURNS) return null;

  const parsedTurns: Turn[] = [];
  for (const t of turns) {
    if (!isRecord(t)) return null;
    if (!(t.player === null || isShortString(t.player, MAX_PLAYER_INPUT_LENGTH))) return null;
    if (!isShortString(t.narration, 20_000) || !Array.isArray(t.rolls)) return null;
    if (t.rolls.length > MAX_ROLLS_PER_TURN || !t.rolls.every(isRoll)) return null;
    parsedTurns.push({ player: t.player as string | null, narration: t.narration as string, rolls: t.rolls as Roll[] });
  }

  return {
    version: 1,
    character: { name: character.name as string | null, backstory: character.backstory },
    stats: { ...STARTING_STATS },
    worldFacts,
    turns: parsedTurns,
  };
}

function isRoll(r: unknown): r is Roll {
  return (
    isRecord(r) &&
    isStat(r.stat) &&
    isDifficulty(r.difficulty) &&
    typeof r.reason === "string" &&
    r.reason.length <= MAX_FACT_LENGTH &&
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
