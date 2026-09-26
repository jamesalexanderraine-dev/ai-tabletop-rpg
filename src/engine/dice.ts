// Deterministic core of the resolution system (see docs/DESIGN.md, "Game state and rules").
// The engine rolls, never the model. Randomness is injected so tests are reproducible.

export type Rng = () => number; // returns a float in [0, 1)

export const STATS = ["might", "agility", "wits", "presence", "spirit", "luck"] as const;
export type Stat = (typeof STATS)[number];

export const DIFFICULTY = {
  easy: 8,
  medium: 12,
  hard: 16,
  heroic: 20,
} as const;
export type Difficulty = keyof typeof DIFFICULTY;

export const MIN_STAT_MODIFIER = -2;
export const MAX_STAT_MODIFIER = 4;

export function rollDie(sides: number, rng: Rng = Math.random): number {
  if (!Number.isInteger(sides) || sides < 2) {
    throw new Error(`A die needs an integer number of sides >= 2, got ${sides}`);
  }
  return Math.floor(rng() * sides) + 1;
}

export function clampStatModifier(modifier: number): number {
  return Math.min(MAX_STAT_MODIFIER, Math.max(MIN_STAT_MODIFIER, Math.trunc(modifier)));
}

export interface CheckInput {
  statModifier: number;
  situationalBonus?: number;
  difficulty: Difficulty | number;
}

export interface CheckResult {
  roll: number;
  statModifier: number;
  situationalBonus: number;
  total: number;
  target: number;
  success: boolean;
  critical: "success" | "failure" | null;
}

// d20 + stat modifier + situational bonus against a difficulty.
// A natural 20 always succeeds and a natural 1 always fails; both are flagged
// so the DM can narrate the big swings.
export function rollCheck(input: CheckInput, rng: Rng = Math.random): CheckResult {
  const statModifier = clampStatModifier(input.statModifier);
  const situationalBonus = Math.trunc(input.situationalBonus ?? 0);
  const target =
    typeof input.difficulty === "number" ? input.difficulty : DIFFICULTY[input.difficulty];
  const roll = rollDie(20, rng);
  const total = roll + statModifier + situationalBonus;
  const critical = roll === 20 ? "success" : roll === 1 ? "failure" : null;
  const success = critical === "success" ? true : critical === "failure" ? false : total >= target;
  return { roll, statModifier, situationalBonus, total, target, success, critical };
}
