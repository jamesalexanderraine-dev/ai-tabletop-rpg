// "Something else": Claude designs an archetype from the player's own concept
// (docs/UPDATES.md). Server-only. The model writes the kit; the engine
// (src/engine/customArchetype.ts) holds it to the same budget as the three
// defaults and sends it back once with the problems if it doesn't fit.

import type Anthropic from "@anthropic-ai/sdk";
import { MAX_CONCEPT_LENGTH, parseCustomArchetype } from "@/engine/customArchetype";
import { STATS } from "@/engine/dice";
import { ABILITIES, ARCHETYPES, SKILLS, STAT_INFO, type CustomArchetype } from "@/engine/progression";
import { defaultSend, DmRefusalError, logUsage, supportsServerFallback, type SendMessage } from "./claude";
import { dmModel, hasAnthropicKey } from "./config";

// The one interface archetype generation sits behind, so tests (and other models) can stand in.
export interface ArchetypeDesigner {
  // Returns the model's draft as-is; `problems` are the engine's objections to the last one.
  design(concept: string, problems?: string[]): Promise<unknown>;
}

export class ArchetypeError extends Error {}

const TOOL_NAME = "create_archetype";

const abilityShape = {
  type: "object",
  properties: {
    name: { type: "string", description: "Short and evocative, 1 to 4 words." },
    cost: { type: "integer", description: "Stamina or MP cost, following the cost guide." },
    description: {
      type: "string",
      description: "One or two sentences (20 to 260 characters): what it does, with a concrete example or two of using it.",
    },
  },
  required: ["name", "cost", "description"],
};

export const ARCHETYPE_TOOL = {
  name: TOOL_NAME,
  description: "Create the player's archetype.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "The archetype's name, like Warrior or Chef. 1 to 3 words." },
      tagline: { type: "string", description: "One or two sentences in the style of the examples (under 200 characters)." },
      magic: {
        type: "boolean",
        description: "True only if the concept is magical by nature; then abilities are spells that spend MP. Otherwise they spend stamina and are never supernatural.",
      },
      stats: {
        type: "object",
        description: "Starting modifiers: whole numbers from 0 to 2 that add up to exactly 5.",
        properties: Object.fromEntries(STATS.map((s) => [s, { type: "integer", minimum: 0, maximum: 2 }])),
        required: [...STATS],
      },
      skills: {
        type: "array",
        description: "Exactly two starting skills, by id.",
        items: { type: "string", enum: SKILLS.map((s) => s.id) },
        minItems: 2,
        maxItems: 2,
      },
      signatureWeapon: { type: "string", description: "The one weapon that defines them, e.g. \"A chef's knife\"." },
      openingHook: {
        type: "string",
        description:
          "One or two sentences, second person, for the opening narration: something in or near their cell that this character, and only this character, would notice or could use.",
      },
      signature: { ...abilityShape, description: "The level 1 signature ability. Cost 1 or 2." },
      abilities: {
        type: "array",
        description: "Exactly ten more abilities, ordered from simplest to most powerful.",
        items: abilityShape,
        minItems: 10,
        maxItems: 10,
      },
    },
    required: ["name", "tagline", "magic", "stats", "skills", "signatureWeapon", "openingHook", "signature", "abilities"],
  },
};

function kit(id: string): string {
  const a = ARCHETYPES.find((x) => x.id === id)!;
  const abilities = ABILITIES.filter((x) => x.archetypes.includes(a.id));
  return [
    `${a.name} (${a.pool}): ${a.tagline}`,
    `  Stats: ${STATS.map((s) => `${s} ${a.stats[s]}`).join(", ")}. Skills: ${Object.keys(a.skills).join(", ")}.`,
    `  Opening hook: ${a.openingHook}`,
    ...abilities.map((x) => `  L${x.level}, cost ${x.cost}: ${x.name}. ${x.description}`),
  ].join("\n");
}

export const ARCHETYPE_PROMPT = `You design player archetypes for a single-player fantasy tabletop RPG run by an AI Dungeon Master. The player didn't want a Warrior, Rogue or Mage, and described who they want to be instead. Build an archetype that is genuinely that concept, all the way down: reason from the concept outward to a coherent, grounded kit that makes the player feel seen. A chef gets foraging from years of hunting for herbs, blade skill from literal knife work, throwing knives, and a chef's knife as their signature weapon.

The game: everyone starts waking in a cell beneath Harrowgate Keep with nothing in their pockets. Sereth, a dark elf thief, is in the cell opposite; Old Tamsin, a bored guard, has the keys. The story is earnest with light comedy underneath.

Balance: the archetype must be exactly as strong as the three hand-made ones below, never stronger or weaker.
- Stats: whole numbers from 0 to 2 that add up to exactly 5, in the concept's shape.
- Two starting skills from the skill list, the two the concept is most obviously trained in.
- A level 1 signature ability (cost 1 or 2) that could help them in the cell, then ten more, ordered from simplest to most powerful. They unlock at levels 2, 2, 2, 2, 3, 3, 3, 4, 4, 5, and cost 1 to 2 at level 2, 2 to 3 at level 3, 2 to 4 at level 4, and 3 to 4 at level 5.
- Match the power of the examples at the same level. No instant wins, no killing or controlling people outright, nothing that makes rolls pointless.
- Abilities are for more than fights: most should open creative, story-moving uses (getting into places, winning people over, learning secrets, making things).
- Magic only if the concept is magical by nature (a witch, a hedge druid, a dragon's heir); then abilities are spells and spend MP. Everything else spends stamina and is never supernatural: grit, training, nerve and craft, even when it lets them do what an ordinary person couldn't.
- Write ability descriptions like the examples: what it does, with a concrete example or two.
- If the concept is overpowered ("a god", "the strongest person alive"), keep its flavour and hold it to the budget: a fallen god who remembers a little of their power.
- If the concept is unsuitable or empty, make the closest good-natured archetype you can.

The stats:
${STAT_INFO.map((s) => `- ${s.id}: ${s.description}`).join("\n")}

The skills (use these ids):
${SKILLS.map((s) => `- ${s.id} (${s.stat}): ${s.description}`).join("\n")}

The hand-made archetypes, for power level and style:
${["warrior", "rogue", "mage"].map(kit).join("\n\n")}

Call ${TOOL_NAME} with the archetype.`;

type Message = Anthropic.Beta.Messages.BetaMessage;

export function createClaudeArchetypeDesigner(options: { send?: SendMessage; model?: string } = {}): ArchetypeDesigner {
  const model = options.model ?? dmModel();
  const send = options.send ?? defaultSend;
  return {
    async design(concept, problems) {
      const request =
        `The player's concept: <concept>${concept}</concept>` +
        (problems?.length
          ? `\n\nYour last design broke these rules. Fix them and call ${TOOL_NAME} again:\n- ${problems.join("\n- ")}`
          : "");
      const response: Message = await send(
        {
          model,
          max_tokens: 4000,
          system: ARCHETYPE_PROMPT,
          tools: [ARCHETYPE_TOOL as Anthropic.Beta.Messages.BetaTool],
          tool_choice: { type: "tool", name: TOOL_NAME },
          messages: [{ role: "user", content: request }],
          output_config: { effort: "low" },
          ...(supportsServerFallback(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
        },
        () => undefined,
      );
      logUsage(
        model,
        {
          calls: 1,
          input: response.usage?.input_tokens ?? 0,
          output: response.usage?.output_tokens ?? 0,
          cacheRead: response.usage?.cache_read_input_tokens ?? 0,
          cacheWrite: response.usage?.cache_creation_input_tokens ?? 0,
        },
        "Archetype usage",
      );
      if (response.stop_reason === "refusal") throw new DmRefusalError("The model declined to design this archetype.");
      const call = response.content.find((b) => b.type === "tool_use" && b.name === TOOL_NAME);
      if (!call || call.type !== "tool_use") throw new Error("The model didn't design an archetype.");
      return call.input;
    },
  };
}

let designerOverride: ArchetypeDesigner | undefined;

// Tests stand in for Claude; undefined restores it.
export function setArchetypeDesignerForTests(designer: ArchetypeDesigner | undefined) {
  designerOverride = designer;
}

// Claude, unless a test stands in; null when no API key is set.
export function archetypeDesigner(): ArchetypeDesigner | null {
  return designerOverride ?? (hasAnthropicKey() ? createClaudeArchetypeDesigner() : null);
}

// The model's draft in the engine's shape. Anything malformed is left for the
// engine's check to report.
function fromDraft(concept: string, draft: unknown): unknown {
  if (typeof draft !== "object" || draft === null) return draft;
  const d = draft as Record<string, unknown>;
  return {
    concept,
    name: d.name,
    tagline: d.tagline,
    pool: d.magic === true ? "MP" : d.magic === false ? "stamina" : undefined,
    stats: d.stats,
    skills: Array.isArray(d.skills) ? Object.fromEntries(d.skills.map((id) => [String(id), 1])) : d.skills,
    signatureWeapon: d.signatureWeapon,
    openingHook: d.openingHook,
    abilities: [d.signature, ...(Array.isArray(d.abilities) ? d.abilities : [])],
  };
}

export function validateConcept(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const concept = raw.replace(/\s+/g, " ").trim();
  return concept && concept.length <= MAX_CONCEPT_LENGTH ? concept : null;
}

// Designs an archetype for the concept, giving the model one chance to fix a
// design that breaks the budget.
export async function generateArchetype(concept: string, designer: ArchetypeDesigner): Promise<CustomArchetype> {
  let problems: string[] | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const parsed = parseCustomArchetype(fromDraft(concept, await designer.design(concept, problems)));
    if (parsed.ok) return parsed.value;
    problems = parsed.errors;
    console.error("Generated archetype broke the rules", JSON.stringify(problems));
  }
  throw new ArchetypeError("Couldn't build a balanced character from that. Try again, or describe it another way.");
}
