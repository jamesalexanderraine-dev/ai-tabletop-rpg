import { describe, expect, it } from "vitest";
import type { Rng } from "./dice";
import {
  appendTurn,
  MAX_BACKSTORY_FACTS,
  MAX_ROLLS_PER_TURN,
  newGame,
  OPENING_NARRATION,
  parseGameState,
  remember,
  requestCheck,
  STARTING_STATS,
  validatePlayerInput,
} from "./game";

const face = (n: number): Rng => () => (n - 1) / 20;

describe("newGame", () => {
  it("starts in the cell with the opening narration and an unnamed character", () => {
    const game = newGame();
    expect(game.turns).toEqual([{ player: null, narration: OPENING_NARRATION, rolls: [] }]);
    expect(game.character).toEqual({ name: null, backstory: [] });
    expect(game.stats).toEqual(STARTING_STATS);
  });
});

describe("requestCheck", () => {
  const game = newGame();

  it("rolls with the character's stat modifier and the situational bonus", () => {
    const outcome = requestCheck(
      game,
      { stat: "wits", difficulty: "medium", situational_bonus: 2, reason: "  pick the lock " },
      0,
      face(9),
    );
    expect(outcome).toEqual({
      ok: true,
      value: expect.objectContaining({
        stat: "wits",
        difficulty: "medium",
        reason: "pick the lock",
        roll: 9,
        total: 9 + STARTING_STATS.wits + 2,
        target: 12,
        success: true,
      }),
    });
  });

  it("defaults the situational bonus to 0", () => {
    const outcome = requestCheck(game, { stat: "luck", difficulty: "easy", reason: "coin flip" }, 0, face(8));
    expect(outcome.ok && outcome.value.total).toBe(8);
  });

  it.each([
    [{ stat: "charisma", difficulty: "easy", reason: "x" }, /Unknown stat/],
    [{ stat: "wits", difficulty: 12, reason: "x" }, /Unknown difficulty/],
    [{ stat: "wits", difficulty: "easy", situational_bonus: 9, reason: "x" }, /situational_bonus/],
    [{ stat: "wits", difficulty: "easy", situational_bonus: 1.5, reason: "x" }, /situational_bonus/],
    [{ stat: "wits", difficulty: "easy", reason: " " }, /reason/],
    ["roll a d20 please", /needs an object/],
  ])("rejects an impossible proposal %j", (proposal, message) => {
    const outcome = requestCheck(game, proposal, 0, face(10));
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.error).toMatch(message);
  });

  it("caps rolls per turn", () => {
    const outcome = requestCheck(game, { stat: "wits", difficulty: "easy", reason: "x" }, MAX_ROLLS_PER_TURN);
    expect(outcome.ok).toBe(false);
  });
});

describe("remember", () => {
  it("sets the name and appends backstory and world facts", () => {
    let game = newGame();
    for (const proposal of [
      { about: "name", text: " Bramble  Oakfoot " },
      { about: "backstory", text: "A beer-brewing monk who wears bread as a hat." },
      { about: "world", text: "Sereth owes Bramble a favour." },
    ]) {
      const outcome = remember(game, proposal);
      if (!outcome.ok) throw new Error(outcome.error);
      game = outcome.value;
    }
    expect(game.character.name).toBe("Bramble Oakfoot");
    expect(game.character.backstory).toEqual(["A beer-brewing monk who wears bread as a hat."]);
    expect(game.worldFacts).toEqual(["Sereth owes Bramble a favour."]);
  });

  it("does not mutate the original state", () => {
    const game = newGame();
    remember(game, { about: "world", text: "The door is open." });
    expect(game.worldFacts).toEqual([]);
  });

  it("rejects unknown kinds, empty text and a full backstory", () => {
    expect(remember(newGame(), { about: "mood", text: "grumpy" }).ok).toBe(false);
    expect(remember(newGame(), { about: "world", text: "" }).ok).toBe(false);
    const full = newGame();
    full.character.backstory = Array.from({ length: MAX_BACKSTORY_FACTS }, (_, i) => `fact ${i}`);
    expect(remember(full, { about: "backstory", text: "one more" }).ok).toBe(false);
  });
});

describe("validatePlayerInput", () => {
  it("trims input and rejects empty or huge input", () => {
    expect(validatePlayerInput("  I wear the bread as a hat  ")).toEqual({ ok: true, value: "I wear the bread as a hat" });
    expect(validatePlayerInput("   ").ok).toBe(false);
    expect(validatePlayerInput("x".repeat(5000)).ok).toBe(false);
    expect(validatePlayerInput(42).ok).toBe(false);
  });
});

describe("parseGameState", () => {
  it("round-trips a real game through JSON", () => {
    const rolled = requestCheck(newGame(), { stat: "might", difficulty: "hard", reason: "bend the bars" }, 0, face(20));
    if (!rolled.ok) throw new Error(rolled.error);
    const game = appendTurn(newGame(), { player: "I bend the bars", narration: "They groan.", rolls: [rolled.value] });
    expect(parseGameState(JSON.parse(JSON.stringify(game)))).toEqual(game);
  });

  it("ignores stats sent by the client", () => {
    const game = { ...newGame(), stats: { ...STARTING_STATS, might: 99 } };
    expect(parseGameState(game)?.stats.might).toBe(STARTING_STATS.might);
  });

  it("rejects malformed state", () => {
    expect(parseGameState(null)).toBeNull();
    expect(parseGameState({ ...newGame(), version: 2 })).toBeNull();
    expect(parseGameState({ ...newGame(), turns: [] })).toBeNull();
    expect(parseGameState({ ...newGame(), turns: [{ player: 1, narration: "x", rolls: [] }] })).toBeNull();
    expect(
      parseGameState({ ...newGame(), turns: [{ player: "x", narration: "y", rolls: [{ stat: "wits" }] }] }),
    ).toBeNull();
  });
});
