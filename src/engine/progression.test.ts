import { describe, expect, it } from "vitest";
import { STATS } from "./dice";
import { newGame, parseGameState, type GameState } from "./game";
import {
  ABILITIES,
  abilitiesFor,
  applyLevelUp,
  ARCHETYPE_IDS,
  ARCHETYPES,
  autoLevelUpChoice,
  levelForXp,
  levelUpNeeds,
  MAX_LEVEL,
  maxEnergyAt,
  pendingLevelUps,
  SKILLS,
  STARTING_SKILL_POINTS,
  TRAITS,
  XP_FOR_LEVEL,
  type Archetype,
  type LevelUpChoice,
} from "./progression";

function withXp(xp: number, state: GameState = newGame("mage")): GameState {
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
    expect(pendingLevelUps(newGame("mage"))).toBe(0);
    expect(pendingLevelUps(withXp(130))).toBe(2);
  });

  it("has catalogs with unique ids", () => {
    for (const list of [SKILLS, ABILITIES, TRAITS]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    }
  });
});

describe("archetypes", () => {
  it.each(ARCHETYPES)("$name starts balanced against the others", (a) => {
    // Same stat budget, same starting skill ranks, a level 1 signature that belongs to them.
    expect(STATS.reduce((sum, s) => sum + a.stats[s], 0)).toBe(5);
    expect(Object.values(a.skills).reduce((x, y) => x + y, 0)).toBe(STARTING_SKILL_POINTS);
    expect(Object.keys(a.skills).every((id) => SKILLS.some((s) => s.id === id))).toBe(true);
    const signature = ABILITIES.find((ab) => ab.id === a.signature);
    expect(signature).toMatchObject({ level: 1 });
    expect(signature?.archetypes).toContain(a.id);
  });

  it("gives every archetype a full ladder of abilities to grow into", () => {
    for (const archetype of ARCHETYPE_IDS) {
      const list = abilitiesFor(archetype);
      expect(list.length).toBeGreaterThanOrEqual(MAX_LEVEL);
      // Something new to learn at every level from 2 to 5.
      for (let level = 2; level <= 5; level++) expect(list.some((a) => a.level === level)).toBe(true);
    }
  });

  it("gives warriors and rogues grounded abilities with a stamina cost, and flavour to spare", () => {
    const grounded = ABILITIES.filter((a) => !a.archetypes.includes("mage"));
    const asked = ["disguise", "lift", "break", "rig", "track", "patch", "meal", "charm", "scare", "lying"];
    const text = grounded.map((a) => `${a.name} ${a.description}`.toLowerCase()).join(" ");
    for (const word of asked) expect(text).toContain(word);
    for (const a of grounded) {
      expect(a.cost).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(60); // enough to suggest creative uses
      expect(a.description).not.toMatch(/magic|spell|enchant|arcane/i);
    }
  });
});

describe("applyLevelUp", () => {
  it("levels up to 2: skill points, an ability, a stat raise, more HP and energy", () => {
    const state = withXp(50);
    expect(levelUpNeeds(state)).toEqual({ level: 2, skillPoints: 2, ability: true, stat: true, trait: false });
    const next = levelUp(state, { skills: { stealth: 1, persuasion: 1 }, ability: "mend", stat: "wits", trait: null });
    expect(next.character).toMatchObject({
      level: 2,
      maxHp: 13,
      hp: 13,
      maxEnergy: maxEnergyAt(2),
      energy: maxEnergyAt(2),
      skills: { arcana: 1, lore: 1, stealth: 1, persuasion: 1 },
      abilities: ["spark", "mend"],
      statRaises: { wits: 1 },
    });
    expect(next.stats.wits).toBe(state.stats.wits + 1);
    expect(pendingLevelUps(next)).toBe(0);
    // The result is a build the server will accept.
    expect(parseGameState(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });

  it("offers only the archetype's own abilities", () => {
    const warrior = withXp(50, newGame("warrior"));
    expect(applyLevelUp(warrior, { skills: { athletics: 2 }, ability: "mend", stat: "might", trait: null }).ok).toBe(false);
    expect(applyLevelUp(warrior, { skills: { athletics: 2 }, ability: "honeyed_words", stat: "might", trait: null }).ok).toBe(false);
    const next = levelUp(warrior, { skills: { athletics: 2 }, ability: "camp_cook", stat: "might", trait: null });
    expect(next.character.abilities).toEqual(["feat_of_strength", "camp_cook"]);
  });

  it("offers a trait at level 3, and no stat raise", () => {
    let state = withXp(120);
    state = levelUp(state, autoLevelUpChoice(state)!);
    expect(levelUpNeeds(state)).toMatchObject({ level: 3, stat: false, trait: true });
    const next = levelUp(state, { skills: { lore: 2 }, ability: "charm", stat: null, trait: "bookworm" });
    expect(next.character.traits).toEqual([expect.objectContaining({ name: "Bookworm", source: "level" })]);
    expect(parseGameState(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });

  it.each([
    [{ skills: { stealth: 1 }, ability: "mend", stat: "wits", trait: null }, /exactly 2 skill points/],
    [{ skills: { stealth: 4 }, ability: "mend", stat: "wits", trait: null }, /exactly 2|rank/],
    [{ skills: { juggling: 2 }, ability: "mend", stat: "wits", trait: null }, /Unknown skill/],
    [{ skills: { stealth: 2 }, ability: "unseen", stat: "wits", trait: null }, /Pick a spell/],
    [{ skills: { stealth: 2 }, ability: null, stat: "wits", trait: null }, /Pick a spell/],
    [{ skills: { stealth: 2 }, ability: "mend", stat: null, trait: null }, /Pick a stat/],
    [{ skills: { stealth: 2 }, ability: "mend", stat: "wits", trait: "bookworm" }, /Traits/],
  ])("rejects an invalid choice %j", (choice, message) => {
    const outcome = applyLevelUp(withXp(50), choice as LevelUpChoice);
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.error).toMatch(message);
  });

  it("refuses when no level-up is due", () => {
    expect(applyLevelUp(newGame("mage"), { skills: {}, ability: null, stat: null, trait: null }).ok).toBe(false);
  });

  it.each(ARCHETYPE_IDS)("'choose for me' always produces a valid %s, all the way to the top level", (archetype: Archetype) => {
    let state = withXp(1_000_000, newGame(archetype));
    while (pendingLevelUps(state) > 0) state = levelUp(state, autoLevelUpChoice(state)!);
    expect(state.character.level).toBe(MAX_LEVEL);
    expect(Object.values(state.stats).every((m) => m <= 4)).toBe(true);
    expect(parseGameState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
});
