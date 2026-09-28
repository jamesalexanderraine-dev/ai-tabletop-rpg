import { describe, expect, it } from "vitest";
import type { Rng } from "./dice";
import { MAX_BACKSTORY_FACTS, MAX_ITEMS, MAX_ROLLS_PER_TURN, newGame, parseGameState, STARTING_HP, type GameState } from "./game";
import { applyLevelUp, archetypeInfo, maxEnergyAt } from "./progression";
import { applyDmTool, type ToolApplied } from "./tools";

const face = (n: number): Rng => () => (n - 1) / 20;
const MAGE_STATS = archetypeInfo("mage").stats;

function apply(state: GameState, name: string, input: unknown, rollsSoFar = 0, rng?: Rng) {
  return applyDmTool(state, name, input, { rollsSoFar, rng });
}

function ok(result: ToolApplied) {
  if (!result.ok) throw new Error(result.error);
  return result;
}

function errorOf(result: ToolApplied): string {
  if (result.ok) throw new Error("expected the engine to reject this");
  return result.error;
}

describe("applyDmTool", () => {
  it("rejects unknown tools and non-object input", () => {
    expect(errorOf(apply(newGame("mage"), "teleport", { to: "the moon" }))).toMatch(/no tool called "teleport"/);
    expect(errorOf(apply(newGame("mage"), "add_item", "a sword"))).toMatch(/object/);
  });
});

describe("roll_check", () => {
  it("rolls with the character's stat and the situational bonus, without changing state", () => {
    const game = newGame("mage");
    const result = ok(
      apply(game, "roll_check", { stat: "wits", difficulty: "medium", situational_bonus: 2, reason: " pick the lock " }, 0, face(9)),
    );
    expect(result.state).toBe(game);
    expect(result.roll).toMatchObject({ stat: "wits", reason: "pick the lock", roll: 9, total: 9 + MAGE_STATS.wits + 2, success: true });
    expect(result.message).toContain("success");
  });

  it.each([
    [{ stat: "charisma", difficulty: "easy", reason: "x" }, /"stat" must be one of/],
    [{ stat: "wits", difficulty: 12, reason: "x" }, /"difficulty" must be one of/],
    [{ stat: "wits", difficulty: "easy", situational_bonus: 9, reason: "x" }, /situational_bonus/],
    [{ stat: "wits", difficulty: "easy", situational_bonus: 1.5, reason: "x" }, /situational_bonus/],
    [{ stat: "wits", difficulty: "easy", reason: " " }, /reason/],
  ])("rejects %j", (input, message) => {
    expect(errorOf(apply(newGame("mage"), "roll_check", input))).toMatch(message);
  });

  it("caps rolls per turn", () => {
    expect(errorOf(apply(newGame("mage"), "roll_check", { stat: "wits", difficulty: "easy", reason: "x" }, MAX_ROLLS_PER_TURN))).toMatch(
      /Only 3 rolls/,
    );
  });
});

describe("remember", () => {
  it("sets the name and appends backstory, without mutating the old state", () => {
    const game = newGame("mage");
    const named = ok(apply(game, "remember", { about: "name", text: " Bramble  Oakfoot " })).state;
    const withStory = ok(apply(named, "remember", { about: "backstory", text: "A beer-brewing monk." })).state;
    expect(withStory.character).toMatchObject({ name: "Bramble Oakfoot", backstory: ["A beer-brewing monk."] });
    expect(game.character.name).toBeNull();
  });

  it("rejects unknown kinds and a full backstory", () => {
    expect(apply(newGame("mage"), "remember", { about: "world", text: "x" }).ok).toBe(false);
    const full = newGame("mage");
    full.character.backstory = Array.from({ length: MAX_BACKSTORY_FACTS }, (_, i) => `fact ${i}`);
    expect(apply(full, "remember", { about: "backstory", text: "one more" }).ok).toBe(false);
  });
});

describe("update_character", () => {
  it("applies harm, XP and conditions and reports them to the player", () => {
    const result = ok(apply(newGame("mage"), "update_character", { hp_change: -3, xp_gain: 10, add_conditions: ["Soaked", "soaked"] }));
    expect(result.state.character).toMatchObject({ hp: STARTING_HP - 3, xp: 10, conditions: ["soaked"] });
    expect(result.change).toEqual({ kind: "vitals", text: `HP ${STARTING_HP} → ${STARTING_HP - 3} · +10 XP · now soaked` });
  });

  it("keeps HP between 0 and max, and tells the DM when the character is down", () => {
    const healed = ok(apply(newGame("mage"), "update_character", { hp_change: 5 }));
    expect(healed.state.character.hp).toBe(STARTING_HP);
    expect(healed.change).toBeUndefined();

    const down = ok(apply(newGame("mage"), "update_character", { hp_change: -20 }));
    expect(down.state.character.hp).toBe(0);
    expect(down.message).toMatch(/down/);
  });

  it("rejects removing a condition the character doesn't have, and empty or huge changes", () => {
    expect(errorOf(apply(newGame("mage"), "update_character", { remove_conditions: ["cursed"] }))).toMatch(/doesn't have: cursed/);
    expect(apply(newGame("mage"), "update_character", {}).ok).toBe(false);
    expect(apply(newGame("mage"), "update_character", { hp_change: -99 }).ok).toBe(false);
    expect(apply(newGame("mage"), "update_character", { xp_gain: -5 }).ok).toBe(false);
  });
});

describe("inventory", () => {
  it("adds items with normalised tags and removes them by name", () => {
    const added = ok(apply(newGame("mage"), "add_item", { name: "Bread hat", tags: ["Edible", "ridiculous", "edible"] }));
    expect(added.state.inventory).toEqual([{ name: "Bread hat", tags: ["edible", "ridiculous"] }]);
    expect(added.change).toEqual({ kind: "item", text: "Gained Bread hat (edible, ridiculous)" });

    const removed = ok(apply(added.state, "remove_item", { name: "bread HAT" }));
    expect(removed.state.inventory).toEqual([]);
    expect(removed.change).toEqual({ kind: "item", text: "Lost Bread hat" });
  });

  it("refuses to remove what the player doesn't have, and says what they do have", () => {
    const game = ok(apply(newGame("mage"), "add_item", { name: "Straw noose", tags: [] })).state;
    expect(errorOf(apply(game, "remove_item", { name: "Sword" }))).toBe('The player doesn\'t have "Sword". They carry: Straw noose.');
  });

  it("rejects duplicates and a full pack", () => {
    const game = ok(apply(newGame("mage"), "add_item", { name: "Key", tags: [] })).state;
    expect(apply(game, "add_item", { name: "key", tags: [] }).ok).toBe(false);
    const full = { ...newGame("mage"), inventory: Array.from({ length: MAX_ITEMS }, (_, i) => ({ name: `Pebble ${i}`, tags: [] })) };
    expect(apply(full, "add_item", { name: "One more", tags: [] }).ok).toBe(false);
  });
});

describe("set_flag", () => {
  it("normalises keys, updates and clears flags", () => {
    const set = ok(apply(newGame("mage"), "set_flag", { key: "Mayor owes favour!", value: "The mayor owes the player one." })).state;
    expect(set.flags).toEqual({ mayor_owes_favour: "The mayor owes the player one." });
    const cleared = ok(apply(set, "set_flag", { key: "mayor_owes_favour", value: null })).state;
    expect(cleared.flags).toEqual({});
    expect(apply(cleared, "set_flag", { key: "mayor_owes_favour", value: null }).ok).toBe(false);
  });
});

describe("npcs", () => {
  it("spawns a new NPC and updates attitudes, showing the shift", () => {
    const spawned = ok(apply(newGame("mage"), "spawn_npc", { name: "Mags", attitude: "friendly", note: "Runs the tavern." }));
    expect(spawned.change).toEqual({ kind: "npc", text: "Met Mags · friendly" });
    const warmed = ok(apply(spawned.state, "update_npc", { name: "old tamsin", attitude: "friendly" }));
    expect(warmed.state.npcs.find((n) => n.name === "Old Tamsin")?.attitude).toBe("friendly");
    expect(warmed.change).toEqual({ kind: "npc", text: "Old Tamsin · unfriendly → friendly" });
  });

  it("keeps who each character is to the player, and shows when that changes", () => {
    expect(newGame("mage").npcs.map((n) => n.role)).toEqual(["Cellmate", "Jailer"]);
    const met = ok(apply(newGame("mage"), "spawn_npc", { name: "Mags", role: "innkeeper", attitude: "friendly", note: "Runs the tavern." }));
    expect(met.state.npcs.at(-1)).toMatchObject({ name: "Mags", role: "Innkeeper" });
    expect(met.change).toEqual({ kind: "npc", text: "Met Mags, innkeeper · friendly" });
    const turned = ok(apply(met.state, "update_npc", { name: "Old Tamsin", role: "Ally", attitude: "friendly" }));
    expect(turned.change).toEqual({ kind: "npc", text: "Old Tamsin · Jailer → Ally, unfriendly → friendly" });
    expect(apply(met.state, "spawn_npc", { name: "Bo", role: "x".repeat(25), attitude: "neutral", note: "y" }).ok).toBe(false);
    expect(parseGameState(JSON.parse(JSON.stringify(turned.state)))?.npcs.find((n) => n.name === "Old Tamsin")?.role).toBe("Ally");
  });

  it("rejects duplicates, unknown NPCs and made-up attitudes", () => {
    expect(apply(newGame("mage"), "spawn_npc", { name: "Sereth", attitude: "friendly", note: "x" }).ok).toBe(false);
    expect(errorOf(apply(newGame("mage"), "update_npc", { name: "Gandalf", attitude: "friendly" }))).toMatch(/Known: Sereth, Old Tamsin/);
    expect(apply(newGame("mage"), "update_npc", { name: "Sereth", attitude: "besotted" }).ok).toBe(false);
  });
});

describe("move_scene and update_story", () => {
  it("moves the player and saves the story so far with its turn number", () => {
    const moved = ok(apply(newGame("mage"), "move_scene", { name: "Guardroom", description: "Cards and cold stew." }));
    expect(moved.state.scene).toEqual({ name: "Guardroom", description: "Cards and cold stew." });
    expect(moved.change).toEqual({ kind: "scene", text: "Guardroom" });

    const story = ok(apply(moved.state, "update_story", { summary: "Bramble escaped the cell." })).state.story;
    expect(story).toEqual({ summary: "Bramble escaped the cell.", turn: 1 });
  });
});

// A level 2 rogue: Stealth 3 (1 to start, 2 bought), Makeshift Disguise and Honeyed Words.
function level2(): GameState {
  const game = newGame("rogue");
  const outcome = applyLevelUp(
    { ...game, character: { ...game.character, xp: 50 } },
    { skills: { stealth: 2 }, ability: "honeyed_words", stat: "agility", trait: null },
  );
  if (!outcome.ok) throw new Error(outcome.error);
  return outcome.state;
}

describe("skills on rolls", () => {
  it("adds the character's rank in the skill, and nothing for an untrained one", () => {
    const agility = archetypeInfo("rogue").stats.agility + 1;
    const trained = ok(apply(level2(), "roll_check", { stat: "agility", skill: "stealth", difficulty: "hard", reason: "sneak" }, 0, face(10)));
    expect(trained.roll).toMatchObject({ skill: "stealth", skillBonus: 3, situationalBonus: 0, total: 10 + agility + 3 });
    expect(trained.message).toContain("Agility (Stealth) check");

    const untrained = ok(apply(level2(), "roll_check", { stat: "might", skill: "athletics", difficulty: "hard", reason: "climb" }, 0, face(10)));
    expect(untrained.roll).toMatchObject({ skillBonus: 0, total: 10 + archetypeInfo("rogue").stats.might });
    expect(apply(level2(), "roll_check", { stat: "might", skill: "juggling", difficulty: "easy", reason: "x" }).ok).toBe(false);
  });
});

describe("use_ability", () => {
  it("lets a mage cast a known spell, spending MP", () => {
    const cast = ok(apply(newGame("mage"), "use_ability", { ability: "Spark" }));
    expect(cast.state.character.energy).toBe(maxEnergyAt(1) - 1);
    expect(cast.change).toEqual({ kind: "spell", text: "Cast Spark · −1 MP" });
    expect(cast.message).toMatch(/Snap a flame/);
  });

  it("lets a warrior or rogue use a grounded ability, spending stamina", () => {
    const heave = ok(apply(newGame("warrior"), "use_ability", { ability: "Feat of Strength" }));
    expect(heave.state.character.energy).toBe(maxEnergyAt(1) - 2);
    expect(heave.change).toEqual({ kind: "spell", text: "Used Feat of Strength · −2 stamina" });
    expect(heave.message).toMatch(/beyond what an ordinary person/);

    // Ids and loose spellings resolve to the same ability.
    const charm = ok(apply(level2(), "use_ability", { ability: "honeyed words" }));
    expect(charm.change?.text).toBe("Used Honeyed Words · −2 stamina");
  });

  it("refuses abilities the character doesn't have, including other archetypes'", () => {
    expect(errorOf(apply(newGame("warrior"), "use_ability", { ability: "Makeshift Disguise" }))).toMatch(
      /doesn't have the ability "Makeshift Disguise"\. Their abilities: Feat of Strength/,
    );
    expect(errorOf(apply(newGame("mage"), "use_ability", { ability: "Fireball" }))).toMatch(/Their spells: Spark/);
  });

  it("refuses when the pool is too low, and rest restores it up to the maximum", () => {
    const spent = ok(apply(newGame("warrior"), "update_character", { energy_change: -3 })).state;
    expect(spent.character.energy).toBe(maxEnergyAt(1) - 3);
    expect(errorOf(apply(spent, "use_ability", { ability: "feat_of_strength" }))).toMatch(/costs 2 stamina and the player has 1/);
    const rested = ok(apply(spent, "update_character", { energy_change: 10 }));
    expect(rested.state.character.energy).toBe(maxEnergyAt(1));
    expect(rested.change?.text).toBe(`stamina 1 \u2192 ${maxEnergyAt(1)}`);
  });
});

describe("grant_trait", () => {
  it("adds a story trait with its upside and downside, once", () => {
    const granted = ok(apply(newGame("mage"), "grant_trait", { name: "Hook for a Hand", upside: "Great for climbing.", downside: "Terrible at knitting." }));
    expect(granted.state.character.traits).toEqual([
      { name: "Hook for a Hand", upside: "Great for climbing.", downside: "Terrible at knitting.", source: "story" },
    ]);
    expect(granted.change).toEqual({ kind: "trait", text: "New trait: Hook for a Hand" });
    expect(apply(granted.state, "grant_trait", { name: "hook for a hand", upside: "x", downside: "y" }).ok).toBe(false);
    expect(apply(newGame("mage"), "grant_trait", { name: "Blessed", upside: "Everything." }).ok).toBe(false);
  });
});
