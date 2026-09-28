import { describe, expect, it } from "vitest";
import { CHEF_DRAFT } from "@/engine/chef.fixture";
import {
  ARCHETYPE_PROMPT,
  ArchetypeError,
  createClaudeArchetypeDesigner,
  generateArchetype,
  validateConcept,
  type ArchetypeDesigner,
} from "./archetype";
import type { SendMessage } from "./claude";

// The chef as the model would draft it (the tool's shape, not the engine's).
const { concept: _concept, pool: _pool, skills: _skills, abilities, ...rest } = CHEF_DRAFT;
const MODEL_DRAFT = { ...rest, magic: false, skills: ["blades", "survival"], signature: abilities[0], abilities: abilities.slice(1) };

function scripted(...drafts: unknown[]): ArchetypeDesigner & { calls: { concept: string; problems?: string[] }[] } {
  const calls: { concept: string; problems?: string[] }[] = [];
  return {
    calls,
    async design(concept, problems) {
      calls.push({ concept, problems });
      return drafts[calls.length - 1];
    },
  };
}

describe("generateArchetype", () => {
  it("turns the model's draft into a balanced kit for the player's concept", async () => {
    const kit = await generateArchetype("a royal chef", scripted(MODEL_DRAFT));
    expect(kit).toMatchObject({ concept: "a royal chef", name: "Chef", pool: "stamina", skills: { blades: 1, survival: 1 } });
    expect(kit.abilities).toHaveLength(11);
  });

  it("sends a design that breaks the budget back once, with the problems", async () => {
    const greedy = { ...MODEL_DRAFT, stats: { ...MODEL_DRAFT.stats, might: 2 } };
    const designer = scripted(greedy, MODEL_DRAFT);
    await expect(generateArchetype("a royal chef", designer)).resolves.toMatchObject({ name: "Chef" });
    expect(designer.calls[1]!.problems!.join(" ")).toMatch(/add up to exactly 5/);
  });

  it("gives up after a second bad design", async () => {
    const bad = { ...MODEL_DRAFT, skills: ["cooking", "blades"] };
    await expect(generateArchetype("a royal chef", scripted(bad, bad))).rejects.toBeInstanceOf(ArchetypeError);
  });

  it("treats magical concepts as spellcasters", async () => {
    const kit = await generateArchetype("a hedge witch", scripted({ ...MODEL_DRAFT, magic: true }));
    expect(kit.pool).toBe("MP");
  });
});

describe("validateConcept", () => {
  it("tidies whitespace and refuses empty or overlong concepts", () => {
    expect(validateConcept("  a  royal\nchef ")).toBe("a royal chef");
    expect(validateConcept("   ")).toBeNull();
    expect(validateConcept("x".repeat(201))).toBeNull();
    expect(validateConcept(42)).toBeNull();
  });
});

describe("createClaudeArchetypeDesigner", () => {
  it("forces the archetype tool, anchors on the defaults, and returns the tool input", async () => {
    let params: Parameters<SendMessage>[0] | undefined;
    const send: SendMessage = async (p) => {
      params = p;
      return {
        id: "msg",
        type: "message",
        role: "assistant",
        model: "test",
        content: [{ type: "tool_use", id: "t1", name: "create_archetype", input: MODEL_DRAFT }],
        stop_reason: "tool_use",
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      } as unknown as Awaited<ReturnType<SendMessage>>;
    };
    const draft = await createClaudeArchetypeDesigner({ send, model: "claude-opus-5" }).design("a royal chef", ["too strong"]);
    expect(draft).toEqual(MODEL_DRAFT);
    expect(params!.tool_choice).toEqual({ type: "tool", name: "create_archetype" });
    const request = JSON.stringify(params!.messages);
    expect(request).toContain("a royal chef");
    expect(request).toContain("too strong");
  });

  it("shows the model all three hand-made kits and every skill id", () => {
    for (const word of ["Feat of Strength", "Makeshift Disguise", "Spark", "survival", "sleight"]) {
      expect(ARCHETYPE_PROMPT).toContain(word);
    }
  });
});
