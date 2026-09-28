import { describe, expect, it } from "vitest";
import { prepareAction } from "./actions";
import { newGame, parseGameState, type GameState } from "./game";

const warrior = (patch: Partial<GameState> = {}): GameState => ({
  ...newGame("warrior"),
  inventory: [
    { name: "Rope", tags: ["long"] },
    { name: "Bread hat", tags: ["edible", "worn"] },
  ],
  ...patch,
});

describe("prepareAction", () => {
  it("does nothing without chips", () => {
    const game = warrior();
    expect(prepareAction(game, {})).toEqual({ ok: true, value: { state: game, ability: undefined, items: undefined, change: undefined, note: "" } });
  });

  it("spends an ability chip's cost up front and tells the DM it's paid for", () => {
    const outcome = prepareAction(warrior(), { ability: "feat_of_strength" });
    if (!outcome.ok) throw new Error(outcome.error);
    expect(outcome.value.state.character.energy).toBe(2);
    expect(outcome.value.change).toEqual({ kind: "spell", text: "Used Feat of Strength · −2 stamina" });
    expect(outcome.value.ability).toBe("feat_of_strength");
    expect(outcome.value.note).toMatch(/already applied.*Don't call use_ability/s);
  });

  it("refuses abilities the character doesn't know or can't afford", () => {
    expect(prepareAction(warrior(), { ability: "spark" })).toEqual({ ok: false, error: "You don't know that ability." });
    const tired = warrior();
    tired.character = { ...tired.character, energy: 1 };
    expect(prepareAction(tired, { ability: "feat_of_strength" })).toEqual({
      ok: false,
      error: "Not enough stamina for Feat of Strength (it costs 2, you have 1).",
    });
    const mage = newGame("mage");
    mage.character = { ...mage.character, energy: 0 };
    expect(prepareAction(mage, { ability: "spark" })).toMatchObject({ ok: false, error: expect.stringContaining("Not enough MP") });
  });

  it("checks item chips against the pack, using the pack's spelling", () => {
    const outcome = prepareAction(warrior(), { items: ["rope", "Bread hat", "Rope"] });
    expect(outcome).toMatchObject({ ok: true, value: { items: ["Rope", "Bread hat"] } });
    if (outcome.ok) expect(outcome.value.note).toContain("Rope, Bread hat");
    expect(prepareAction(warrior(), { items: ["Sword"] })).toEqual({ ok: false, error: "Sword isn't in your pack any more." });
    expect(prepareAction(warrior(), { items: ["Rope", "Rope", "Rope", "Rope"] }).ok).toBe(false);
    expect(prepareAction(warrior(), { items: [] })).toMatchObject({ ok: true, value: { items: undefined, note: "" } });
  });

  it("keeps chips on saved turns", () => {
    const game = warrior();
    game.turns = [...game.turns, { player: "I lift", narration: "Up it goes.", rolls: [], changes: [], ability: "feat_of_strength", items: ["Rope"] }];
    expect(parseGameState(JSON.parse(JSON.stringify(game)))?.turns.at(-1)).toMatchObject({ ability: "feat_of_strength", items: ["Rope"] });
  });
});
