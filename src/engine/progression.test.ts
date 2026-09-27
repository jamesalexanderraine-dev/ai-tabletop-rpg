import { describe, expect, it } from "vitest";
import { newGame, parseGameState, type GameState } from "./game";
import {
  applyLevelUp,
  autoLevelUpChoice,
  levelForXp,
  levelUpNeeds,
  MAX_LEVEL,
  pendingLevelUps,
  SKILLS,
  SPELLS,
  TRAITS,
  XP_FOR_LEVEL,
  type LevelUpChoice,
} from "./progression";

function withXp(xp: number, state: GameState = newGame()): GameState {
  return { ...state, character: { ...state.character, xp } };
}

function levelUp(state: GameState, choice: LevelUpChoice): GameState {
  const outcome = applyLevelUp(state, choice);
  if (!outcome.ok) throw new Error(outcome.error);
  return outcome.state;
}

describe("levels", () => {
  it("maps XP to levels and caps at the max", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(49)).toBe(1);
    expect(levelForXp(50)).toBe(2);
    expect(levelForXp(XP_FOR_LEVEL[4]!)).toBe(5);
    expect(levelForXp(1_000_000)).toBe(MAX_LEVEL);
  });

  it("counts pending level-ups", () => {
    expect(pendingLevelUps(newGame())).toBe(0);
    expect(pendingLevelUps(withXp(130))).toBe(2);
  });

  it("has catalogs with unique ids", () => {
    for (const list of [SKILLS, SPELLS, TRAITS]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    }
    expect(SPELLS.every((s) => s.level >= 2)).toBe(true);
  });
});

describe("applyLevelUp", () => {
  it("levels up to 2: skill points, a spell, a stat raise, more HP and MP", () => {
    const state = withXp(50);
    expect(levelUpNeeds(state)).toEqual({ level: 2, skillPoints: 2, spell: true, stat: true, trait: false });
    const next = levelUp(state, { skills: { stealth: 1, persuasion: 1 }, spell: "mend", stat: "wits", trait: null });
    expect(next.character).toMatchObject({
      level: 2,
      maxHp: 13,
      hp: 13,
      maxMp: 3,
      mp: 3,
      skills: { stealth: 1, persuasion: 1 },
      spells: ["mend"],
      statRaises: { wits: 1 },
    });
    expect(next.stats.wits).toBe(state.stats.wits + 1);
    expect(pendingLevelUps(next)).toBe(0);
    // The result is a build the server will accept.
    expect(parseGameState(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });

  it("offers a trait at level 3, and no stat raise", () => {
    let state = withXp(120);
    state = levelUp(state, autoLevelUpChoice(state)!);
    expect(levelUpNeeds(state)).toMatchObject({ level: 3, stat: false, trait: true });
    const next = levelUp(state, { skills: { lore: 2 }, spell: "charm", stat: null, trait: "bookworm" });
    expect(next.character.traits).toEqual([expect.objectContaining({ name: "Bookworm", source: "level" })]);
    expect(parseGameState(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });

  it.each([
    [{ skills: { stealth: 1 }, spell: "mend", stat: "wits", trait: null }, /exactly 2 skill points/],
    [{ skills: { stealth: 3 }, spell: "mend", stat: "wits", trait: null }, /exactly 2|rank/],
    [{ skills: { juggling: 2 }, spell: "mend", stat: "wits", trait: null }, /Unknown skill/],
    [{ skills: { stealth: 2 }, spell: "unseen", stat: "wits", trait: null }, /Pick a spell/],
    [{ skills: { stealth: 2 }, spell: null, stat: "wits", trait: null }, /Pick a spell/],
    [{ skills: { stealth: 2 }, spell: "mend", stat: null, trait: null }, /Pick a stat/],
    [{ skills: { stealth: 2 }, spell: "mend", stat: "wits", trait: "bookworm" }, /Traits/],
  ])("rejects an invalid choice %j", (choice, message) => {
    const outcome = applyLevelUp(withXp(50), choice as LevelUpChoice);
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.error).toMatch(message);
  });

  it("refuses when no level-up is due", () => {
    expect(applyLevelUp(newGame(), { skills: {}, spell: null, stat: null, trait: null }).ok).toBe(false);
  });

  it("'choose for me' always produces a valid choice, all the way to the top level", () => {
    let state = withXp(1_000_000);
    while (pendingLevelUps(state) > 0) state = levelUp(state, autoLevelUpChoice(state)!);
    expect(state.character.level).toBe(MAX_LEVEL);
    expect(Object.values(state.stats).every((m) => m <= 4)).toBe(true);
    expect(parseGameState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
});
