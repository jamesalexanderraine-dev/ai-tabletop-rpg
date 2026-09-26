import { describe, expect, it } from "vitest";
import { clampStatModifier, DIFFICULTY, rollCheck, rollDie, type Rng } from "./dice";

// An rng that makes rollDie(20) return exactly `face`.
const face = (n: number): Rng => () => (n - 1) / 20;

describe("rollDie", () => {
  it("covers 1..sides", () => {
    expect(rollDie(20, () => 0)).toBe(1);
    expect(rollDie(20, () => 0.9999)).toBe(20);
    expect(rollDie(6, () => 0.5)).toBe(4);
  });

  it("rejects nonsense dice", () => {
    expect(() => rollDie(1)).toThrow();
    expect(() => rollDie(2.5)).toThrow();
  });
});

describe("clampStatModifier", () => {
  it("keeps modifiers in the -2..+4 band", () => {
    expect(clampStatModifier(-5)).toBe(-2);
    expect(clampStatModifier(9)).toBe(4);
    expect(clampStatModifier(2)).toBe(2);
  });
});

describe("rollCheck", () => {
  it("adds stat and situational bonus to the d20", () => {
    const r = rollCheck({ statModifier: 3, situationalBonus: 2, difficulty: "medium" }, face(7));
    expect(r.total).toBe(12);
    expect(r.target).toBe(DIFFICULTY.medium);
    expect(r.success).toBe(true);
    expect(r.critical).toBeNull();
  });

  it("fails below the target", () => {
    const r = rollCheck({ statModifier: 0, difficulty: "hard" }, face(15));
    expect(r.success).toBe(false);
  });

  it("natural 20 always succeeds, natural 1 always fails", () => {
    expect(rollCheck({ statModifier: -2, difficulty: 30 }, face(20))).toMatchObject({
      success: true,
      critical: "success",
    });
    expect(rollCheck({ statModifier: 4, situationalBonus: 10, difficulty: "easy" }, face(1))).toMatchObject({
      success: false,
      critical: "failure",
    });
  });
});
