import { describe, expect, it } from "vitest";
import {
  appendTurn,
  newGame,
  OPENING_NARRATION,
  OPENING_SCENE,
  parseGameState,
  STARTING_HP,
  STARTING_STATS,
  validatePlayerInput,
} from "./game";
import { applyDmTool } from "./tools";

describe("newGame", () => {
  it("starts in the cell with the opening narration, full HP and empty pockets", () => {
    const game = newGame();
    expect(game.turns).toEqual([{ player: null, narration: OPENING_NARRATION, rolls: [], changes: [] }]);
    expect(game.character).toMatchObject({ name: null, hp: STARTING_HP, maxHp: STARTING_HP, xp: 0, conditions: [] });
    expect(game.stats).toEqual(STARTING_STATS);
    expect(game.inventory).toEqual([]);
    expect(game.scene).toEqual(OPENING_SCENE);
    expect(game.npcs.map((n) => n.name)).toEqual(["Sereth", "Old Tamsin"]);
  });

  it("gives each game its own copies", () => {
    const a = newGame();
    a.npcs[0]!.attitude = "allied";
    expect(newGame().npcs[0]!.attitude).toBe("neutral");
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
  function playedGame() {
    let game = newGame();
    for (const [name, input] of [
      ["add_item", { name: "Bread hat", tags: ["edible", "ridiculous", "worn"] }],
      ["update_character", { hp_change: -3, add_conditions: ["soaked"] }],
      ["set_flag", { key: "tamsin_bribed", value: "Old Tamsin took a bribe of one sock." }],
      ["move_scene", { name: "Guardroom", description: "A cramped room with a card table." }],
    ] as const) {
      const applied = applyDmTool(game, name, input, { rollsSoFar: 0 });
      if (!applied.ok) throw new Error(applied.error);
      game = applied.state;
    }
    return appendTurn(game, {
      player: "I put the bread on my head",
      narration: "It fits perfectly.",
      rolls: [],
      changes: [{ kind: "item", text: "Gained Bread hat" }],
    });
  }

  it("round-trips a played game through JSON, bread hat included", () => {
    const game = playedGame();
    const parsed = parseGameState(JSON.parse(JSON.stringify(game)));
    expect(parsed).toEqual(game);
    expect(parsed?.inventory[0]).toEqual({ name: "Bread hat", tags: ["edible", "ridiculous", "worn"] });
  });

  it("ignores stats sent by the client", () => {
    const game = { ...newGame(), stats: { ...STARTING_STATS, might: 99 } };
    expect(parseGameState(game)?.stats.might).toBe(STARTING_STATS.might);
  });

  it("upgrades a Milestone 1 save without losing the story", () => {
    const v1 = {
      version: 1,
      character: { name: "Bramble", backstory: ["A brewer-monk."] },
      stats: STARTING_STATS,
      worldFacts: ["Sereth owes Bramble a favour."],
      turns: [
        { player: null, narration: OPENING_NARRATION, rolls: [] },
        { player: "I'm Bramble", narration: "Sereth nods.", rolls: [] },
      ],
    };
    const upgraded = parseGameState(v1);
    expect(upgraded?.version).toBe(3);
    expect(upgraded?.character).toMatchObject({ name: "Bramble", backstory: ["A brewer-monk."], hp: STARTING_HP });
    expect(upgraded?.flags).toEqual({ fact_1: "Sereth owes Bramble a favour." });
    expect(upgraded?.turns.map((t) => t.narration)).toEqual([OPENING_NARRATION, "Sereth nods."]);
    expect(upgraded?.turns.every((t) => t.changes.length === 0)).toBe(true);
  });

  it("rejects malformed or tampered state", () => {
    const good = newGame();
    expect(parseGameState(null)).toBeNull();
    expect(parseGameState({ ...good, version: 4 })).toBeNull();
    expect(parseGameState({ ...good, turns: [] })).toBeNull();
    expect(parseGameState({ ...good, character: { ...good.character, hp: 50 } })).toBeNull();
    expect(parseGameState({ ...good, inventory: [{ name: "Sword" }] })).toBeNull();
    expect(parseGameState({ ...good, npcs: [{ name: "Tamsin", attitude: "besotted", note: "" }] })).toBeNull();
    expect(parseGameState({ ...good, turns: [{ player: 1, narration: "x", rolls: [], changes: [] }] })).toBeNull();
    expect(
      parseGameState({ ...good, turns: [{ player: "x", narration: "y", rolls: [{ stat: "wits" }], changes: [] }] }),
    ).toBeNull();
  });

  it("upgrades a Milestone 2 save to level 1, with earned XP ready to level up", () => {
    const v2 = { ...newGame(), version: 2, character: { name: "Bramble", backstory: [], hp: 8, maxHp: 10, xp: 60, conditions: ["soaked"] } };
    const upgraded = parseGameState(v2);
    expect(upgraded?.character).toMatchObject({ name: "Bramble", level: 1, xp: 60, hp: 8, mp: 0, conditions: ["soaked"], spells: [] });
  });

  it("rejects builds the rules don't allow", () => {
    const good = newGame();
    const withChar = (patch: object) => ({ ...good, character: { ...good.character, ...patch } });
    expect(parseGameState(withChar({ level: 2 }))).toBeNull(); // level without the XP
    expect(parseGameState(withChar({ skills: { stealth: 1 } }))).toBeNull(); // points not earned yet
    expect(parseGameState(withChar({ spells: ["mend"] }))).toBeNull(); // no spells at level 1
    expect(parseGameState(withChar({ statRaises: { might: 1 } }))).toBeNull();
    expect(parseGameState(withChar({ maxHp: 50, hp: 50 }))).toBeNull();

    const level2 = withChar({ level: 2, xp: 50, maxHp: 13, hp: 13, maxMp: 3, mp: 3, skills: { stealth: 2 }, spells: ["mend"], statRaises: { wits: 1 } });
    expect(parseGameState(level2)?.stats.wits).toBe(STARTING_STATS.wits + 1);
    expect(parseGameState({ ...level2, character: { ...level2.character, spells: ["unseen"] } })).toBeNull(); // level 5 spell
    expect(parseGameState({ ...level2, character: { ...level2.character, skills: { stealth: 3 } } })).toBeNull();
  });
});
