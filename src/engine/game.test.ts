import { describe, expect, it } from "vitest";
import { appendTurn, newGame, OPENING_SCENE, openingNarration, parseGameState, STARTING_HP, validatePlayerInput } from "./game";
import { ARCHETYPE_IDS, archetypeInfo, maxEnergyAt } from "./progression";
import { applyDmTool } from "./tools";

const MAGE_STATS = archetypeInfo("mage").stats;

describe("newGame", () => {
  it.each(ARCHETYPE_IDS)("starts a %s in the cell with its own spread, skills and signature ability", (archetype) => {
    const info = archetypeInfo(archetype);
    const game = newGame(archetype);
    expect(game.turns).toEqual([{ player: null, narration: openingNarration(archetype), rolls: [], changes: [] }]);
    expect(game.turns[0]!.narration).toContain(info.openingHook);
    expect(game.character).toMatchObject({
      name: null,
      archetype,
      hp: STARTING_HP,
      maxHp: STARTING_HP,
      energy: maxEnergyAt(1),
      maxEnergy: maxEnergyAt(1),
      xp: 0,
      conditions: [],
      skills: info.skills,
      abilities: [info.signature],
    });
    expect(game.stats).toEqual(info.stats);
    expect(game.inventory).toEqual([]);
    expect(game.scene).toEqual(OPENING_SCENE);
    expect(game.npcs.map((n) => n.name)).toEqual(["Sereth", "Old Tamsin"]);
    // Every new character is a legal build.
    expect(parseGameState(JSON.parse(JSON.stringify(game)))).toEqual(game);
  });

  it("gives each game its own copies", () => {
    const a = newGame("warrior");
    a.npcs[0]!.attitude = "allied";
    a.character.skills.brawling = 3;
    expect(newGame("warrior").npcs[0]!.attitude).toBe("neutral");
    expect(newGame("warrior").character.skills.brawling).toBe(1);
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
    let game = newGame("rogue");
    for (const [name, input] of [
      ["add_item", { name: "Bread hat", tags: ["edible", "ridiculous", "worn"] }],
      ["update_character", { hp_change: -3, add_conditions: ["soaked"] }],
      ["set_flag", { key: "tamsin_bribed", value: "Old Tamsin took a bribe of one sock." }],
      ["move_scene", { name: "Guardroom", description: "A cramped room with a card table." }],
      ["use_ability", { ability: "Makeshift Disguise" }],
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
    const game = { ...newGame("mage"), stats: { ...MAGE_STATS, might: 99 } };
    expect(parseGameState(game)?.stats.might).toBe(MAGE_STATS.might);
  });

  it("upgrades a Milestone 1 save without losing the story", () => {
    const v1 = {
      version: 1,
      character: { name: "Bramble", backstory: ["A brewer-monk."] },
      stats: MAGE_STATS,
      worldFacts: ["Sereth owes Bramble a favour."],
      turns: [
        { player: null, narration: "You wake in a cell.", rolls: [] },
        { player: "I'm Bramble", narration: "Sereth nods.", rolls: [] },
      ],
    };
    const upgraded = parseGameState(v1);
    expect(upgraded?.version).toBe(4);
    expect(upgraded?.character).toMatchObject({ name: "Bramble", backstory: ["A brewer-monk."], hp: STARTING_HP, archetype: "mage" });
    expect(upgraded?.flags).toEqual({ fact_1: "Sereth owes Bramble a favour." });
    expect(upgraded?.turns.map((t) => t.narration)).toEqual(["You wake in a cell.", "Sereth nods."]);
    expect(upgraded?.turns.every((t) => t.changes.length === 0)).toBe(true);
  });

  it("upgrades a Milestone 2 save to a level 1 mage, with earned XP ready to level up", () => {
    const v2 = { ...newGame("mage"), version: 2, character: { name: "Bramble", backstory: [], hp: 8, maxHp: 10, xp: 60, conditions: ["soaked"] } };
    const upgraded = parseGameState(v2);
    expect(upgraded?.character).toMatchObject({
      name: "Bramble",
      archetype: "mage",
      level: 1,
      xp: 60,
      hp: 8,
      conditions: ["soaked"],
      abilities: ["spark"],
    });
  });

  it("upgrades a Milestone 3 save (spells, MP) to a mage that keeps its spells", () => {
    const v3 = {
      ...newGame("mage"),
      version: 3,
      stats: { might: 1, agility: 1, wits: 3, presence: 1, spirit: 0, luck: 0 },
      character: {
        name: "Bramble",
        backstory: [],
        level: 2,
        xp: 60,
        hp: 13,
        maxHp: 13,
        mp: 1,
        maxMp: 3,
        conditions: [],
        statRaises: { wits: 1 },
        skills: { stealth: 1, arcana: 1 },
        spells: ["mend"],
        traits: [],
      },
    };
    const upgraded = parseGameState(v3);
    expect(upgraded?.character).toMatchObject({
      archetype: "mage",
      level: 2,
      energy: maxEnergyAt(2),
      maxEnergy: maxEnergyAt(2),
      abilities: ["spark", "mend"],
      skills: { stealth: 1, arcana: 2, lore: 1 },
      statRaises: { wits: 1 },
    });
    expect(upgraded?.character).not.toHaveProperty("spells");
    expect(upgraded?.stats.wits).toBe(MAGE_STATS.wits + 1);
  });

  it("rejects malformed or tampered state", () => {
    const good = newGame("mage");
    expect(parseGameState(null)).toBeNull();
    expect(parseGameState({ ...good, version: 5 })).toBeNull();
    expect(parseGameState({ ...good, turns: [] })).toBeNull();
    expect(parseGameState({ ...good, character: { ...good.character, hp: 50 } })).toBeNull();
    expect(parseGameState({ ...good, character: { ...good.character, archetype: "bard" } })).toBeNull();
    expect(parseGameState({ ...good, inventory: [{ name: "Sword" }] })).toBeNull();
    expect(parseGameState({ ...good, npcs: [{ name: "Tamsin", attitude: "besotted", note: "" }] })).toBeNull();
    expect(parseGameState({ ...good, turns: [{ player: 1, narration: "x", rolls: [], changes: [] }] })).toBeNull();
    expect(
      parseGameState({ ...good, turns: [{ player: "x", narration: "y", rolls: [{ stat: "wits" }], changes: [] }] }),
    ).toBeNull();
  });

  it("rejects builds the rules don't allow", () => {
    const good = newGame("rogue");
    const withChar = (patch: object) => ({ ...good, character: { ...good.character, ...patch } });
    expect(parseGameState(withChar({ level: 2 }))).toBeNull(); // level without the XP
    expect(parseGameState(withChar({ skills: { sleight: 1, stealth: 1, lore: 1 } }))).toBeNull(); // points not earned yet
    expect(parseGameState(withChar({ abilities: ["makeshift_disguise", "vanish"] }))).toBeNull(); // too many at level 1
    expect(parseGameState(withChar({ abilities: ["feat_of_strength"] }))).toBeNull(); // a warrior's ability
    expect(parseGameState(withChar({ abilities: ["spark"] }))).toBeNull(); // a mage's spell
    expect(parseGameState(withChar({ statRaises: { might: 1 } }))).toBeNull();
    expect(parseGameState(withChar({ maxHp: 50, hp: 50 }))).toBeNull();
    expect(parseGameState(withChar({ maxEnergy: 40, energy: 40 }))).toBeNull();

    const level2 = withChar({
      level: 2,
      xp: 50,
      maxHp: 13,
      hp: 13,
      maxEnergy: maxEnergyAt(2),
      energy: maxEnergyAt(2),
      skills: { sleight: 1, stealth: 3 },
      abilities: ["makeshift_disguise", "honeyed_words"],
      statRaises: { agility: 1 },
    });
    expect(parseGameState(level2)?.stats.agility).toBe(archetypeInfo("rogue").stats.agility + 1);
    expect(parseGameState({ ...level2, character: { ...level2.character, abilities: ["makeshift_disguise", "vanish"] } })).toBeNull(); // level 3 ability
    expect(parseGameState({ ...level2, character: { ...level2.character, skills: { sleight: 3, stealth: 3 } } })).toBeNull();
  });
});
