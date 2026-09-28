import { describe, expect, it } from "vitest";
import { CUSTOM_ABILITY_LEVELS, parseCustomArchetype } from "./customArchetype";
import { newGame, parseGameState, type GameState } from "./game";
import { applyDmTool } from "./tools";
import { CHEF_DRAFT } from "./chef.fixture";
import { abilitiesFor, applyLevelUp, autoLevelUpChoice, MAX_LEVEL, pendingLevelUps, type CustomArchetype } from "./progression";

const chef = (): CustomArchetype => {
  const parsed = parseCustomArchetype(CHEF_DRAFT);
  if (!parsed.ok) throw new Error(parsed.errors.join(" "));
  return parsed.value;
};

describe("parseCustomArchetype", () => {
  it("accepts a kit within the budget, placing abilities on the defaults' schedule", () => {
    const k = chef();
    expect(k.abilities.map((a) => a.level)).toEqual([...CUSTOM_ABILITY_LEVELS]);
    expect(k.abilities[0]).toMatchObject({ id: "mise_en_place", level: 1, archetypes: ["custom"] });
    expect(k.abilities.map((a) => a.id)).toContain("poisoner_s_palate");
  });

  it("pulls costs into the range for their level instead of trusting the generator", () => {
    const costs = Object.fromEntries(chef().abilities.map((a) => [a.name, a.cost]));
    expect(costs["Flambé"]).toBe(3); // asked for 9 at level 3
    expect(costs["Iron Stomach Cook"]).toBe(2); // asked for 0 at level 4
    expect(costs["Signature Dish"]).toBe(4);
  });

  it("rejects kits that are stronger than the defaults", () => {
    const tooStrong = parseCustomArchetype({ ...CHEF_DRAFT, stats: { ...CHEF_DRAFT.stats, might: 2 } });
    expect(tooStrong).toMatchObject({ ok: false });
    if (!tooStrong.ok) expect(tooStrong.errors.join(" ")).toMatch(/add up to exactly 5/);
    expect(parseCustomArchetype({ ...CHEF_DRAFT, stats: { might: 3, agility: 2, wits: 0, presence: 0, spirit: 0, luck: 0 } }).ok).toBe(false);
    expect(parseCustomArchetype({ ...CHEF_DRAFT, skills: { blades: 1, survival: 1, stealth: 1 } }).ok).toBe(false);
    expect(parseCustomArchetype({ ...CHEF_DRAFT, skills: { blades: 2 } }).ok).toBe(false);
    expect(parseCustomArchetype({ ...CHEF_DRAFT, skills: { cooking: 1, blades: 1 } }).ok).toBe(false);
    expect(parseCustomArchetype({ ...CHEF_DRAFT, abilities: [...CHEF_DRAFT.abilities, CHEF_DRAFT.abilities[1]] }).ok).toBe(false);
    expect(parseCustomArchetype({ ...CHEF_DRAFT, pool: "rage" }).ok).toBe(false);
  });

  it("gives duplicate ability names distinct ids", () => {
    const abilities = CHEF_DRAFT.abilities.map((a, i) => (i === 2 ? { ...a, name: "Throwing Knives" } : a));
    const parsed = parseCustomArchetype({ ...CHEF_DRAFT, abilities });
    expect(parsed.ok && parsed.value.abilities.slice(1, 3).map((a) => a.id)).toEqual(["throwing_knives", "throwing_knives_2"]);
  });

  it("is stable: a parsed kit parses to itself", () => {
    expect(parseCustomArchetype(JSON.parse(JSON.stringify(chef())))).toEqual({ ok: true, value: chef() });
  });
});

describe("a game with a generated archetype", () => {
  it("starts with the kit's stats, skills, signature and opening hook", () => {
    const game = newGame(chef());
    expect(game.character).toMatchObject({ archetype: "custom", skills: { blades: 1, survival: 1 }, abilities: ["mise_en_place"] });
    expect(game.stats).toEqual(CHEF_DRAFT.stats);
    expect(game.turns[0]!.narration).toContain("Somebody's stew is burning");
    expect(parseGameState(JSON.parse(JSON.stringify(game)))).toEqual(game);
  });

  it("levels up through its own abilities, all the way to the top", () => {
    let state: GameState = newGame(chef());
    state = { ...state, character: { ...state.character, xp: 1_000_000 } };
    while (pendingLevelUps(state) > 0) {
      const next = applyLevelUp(state, autoLevelUpChoice(state)!);
      if (!next.ok) throw new Error(next.error);
      state = next.state;
    }
    expect(state.character.level).toBe(MAX_LEVEL);
    expect(state.character.abilities.every((id) => abilitiesFor(state.character).some((a) => a.id === id))).toBe(true);
    expect(parseGameState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("can't learn another archetype's abilities", () => {
    const state = { ...newGame(chef()), character: { ...newGame(chef()).character, xp: 60 } };
    const choice = { skills: { blades: 2 }, ability: "sunder", stat: "might" as const, trait: null };
    expect(applyLevelUp(state, choice).ok).toBe(false);
    expect(applyLevelUp(state, { ...choice, ability: "throwing_knives" }).ok).toBe(true);
  });

  it("refuses saves whose kit breaks the budget", () => {
    const game = JSON.parse(JSON.stringify(newGame(chef())));
    game.character.custom.stats.might = 2;
    expect(parseGameState(game)).toBeNull();
    const missing = JSON.parse(JSON.stringify(newGame(chef())));
    delete missing.character.custom;
    expect(parseGameState(missing)).toBeNull();
  });

  it("uses its abilities by name or id, at the kit's cost in stamina", () => {
    const ctx = { rollsSoFar: 0 };
    const game = newGame(chef());
    const used = applyDmTool(game, "use_ability", { ability: "Mise en Place" }, ctx);
    expect(used).toMatchObject({ ok: true, change: { text: "Used Mise en Place · −2 stamina" } });
    expect(applyDmTool(game, "use_ability", { ability: "feat_of_strength" }, ctx).ok).toBe(false);
  });
});
