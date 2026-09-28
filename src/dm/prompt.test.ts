import { describe, expect, it } from "vitest";
import { DIFFICULTY, STATS } from "@/engine/dice";
import { SKILLS, STAT_INFO } from "@/engine/progression";
import { newGame } from "@/engine/game";
import { parseNarration } from "@/engine/narration";
import { buildStateSummary, DM_TOOLS, SYSTEM_PROMPT } from "./prompt";

describe("SYSTEM_PROMPT", () => {
  it("makes a failed roll a real failure, never a success with a cost", () => {
    expect(SYSTEM_PROMPT).toContain("What the player intended does not happen");
    expect(SYSTEM_PROMPT).toContain("never into a success with a cost");
    expect(SYSTEM_PROMPT).toContain("alternate route");
    // The old rule that invited fail-forward softening is gone.
    expect(SYSTEM_PROMPT).not.toContain("never a dead end");
  });

  it("gives every difficulty tier its number and example tasks", () => {
    for (const [name, target] of Object.entries(DIFFICULTY)) {
      expect(SYSTEM_PROMPT).toMatch(new RegExp(`- ${name} \\(${target}\\): \\w`));
    }
    expect(SYSTEM_PROMPT).toContain("Trivial or certain actions get no roll");
  });

  it("keeps the player's rolls theirs: no visible checks for enemies", () => {
    expect(SYSTEM_PROMPT).toContain("roll_check is only for the player character's actions");
    const rollCheck = DM_TOOLS.find((t) => t.name === "roll_check");
    expect(rollCheck?.description).toContain("Never use it for enemies or NPCs");
  });

  it("asks for dialogue in say tags the story can turn into bubbles, and shows the format working", () => {
    expect(SYSTEM_PROMPT).toContain('<say who="Name">');
    expect(SYSTEM_PROMPT).toContain('<say who="You">');
    // The opening scene uses the same format, so the first thing the player sees is a bubble.
    const opening = parseNarration(newGame("rogue").turns[0]!.narration);
    expect(opening.at(-1)).toMatchObject({ kind: "speech", who: "The dark elf", npc: "Sereth", text: expect.stringContaining("Who are you") });
    expect(buildStateSummary(newGame("rogue"))).toContain("Sereth (Cellmate), neutral");
    expect(DM_TOOLS.find((t) => t.name === "spawn_npc")?.input_schema.required).toContain("role");
  });

  it("defines every stat and skill the way the player sees them", () => {
    for (const stat of STAT_INFO) expect(SYSTEM_PROMPT).toContain(`- ${stat.name}: ${stat.description}`);
    for (const skill of SKILLS) expect(SYSTEM_PROMPT).toContain(`- ${skill.id} (`);
  });
});

describe("stat and skill one-liners", () => {
  it("covers every stat, and keeps every description short", () => {
    expect(STAT_INFO.map((s) => s.id)).toEqual([...STATS]);
    for (const d of [...STAT_INFO, ...SKILLS].map((x) => x.description)) {
      expect(d.length).toBeGreaterThan(20);
      expect(d.length).toBeLessThanOrEqual(120);
    }
  });
});

describe("abilities in the prompt", () => {
  it("charges the same cost whether or not the player names the ability", () => {
    expect(SYSTEM_PROMPT).toContain("call use_ability, whether or not they name it");
    expect(SYSTEM_PROMPT).toContain("never supernatural");
    expect(DM_TOOLS.map((t) => t.name)).toContain("use_ability");
    expect(DM_TOOLS.map((t) => t.name)).not.toContain("cast_spell");
  });

  it("tells the DM the archetype, pool and abilities with their costs", () => {
    const summary = buildStateSummary(newGame("warrior"));
    expect(summary).toContain("a warrior. Level 1.");
    expect(summary).toContain("stamina 4/4");
    expect(summary).toMatch(/Abilities: Feat of Strength \(2 stamina\): Lift, hold or haul/);
    expect(buildStateSummary(newGame("mage"))).toMatch(/MP 4\/4.*Abilities: Spark \(1 MP\)/s);
  });
});

