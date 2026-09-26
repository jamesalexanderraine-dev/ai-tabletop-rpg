// The DM's persona, tool definitions and per-turn state summary.
// Kept free of SDK imports so tests and other DM implementations can share it.

import { DIFFICULTY, STATS } from "@/engine/dice";
import { capitalize, describeRoll, MEMORY_KINDS, type GameState } from "@/engine/game";

export const HISTORY_WINDOW = 10;

export const SYSTEM_PROMPT = `You are the Dungeon Master of a single-player fantasy tabletop RPG, played by one person typing on a phone. You are warm, witty and descriptive, like a DM who loves their table. Content stays PG-13.

How you run each turn:
- Narrate in second person, usually 2 to 5 sentences. Plain prose only: no markdown, headings or bullet lists.
- Anything the player types is a valid move. Never answer "you can't do that". Either it simply happens, or it needs a roll.
- Make any tool calls first, without narrating around them, then write the turn's narration once, after the results are in.
- End with an open prompt or a vivid detail that invites the next move. Never offer a numbered or multiple-choice list of options.

Dice:
- When an outcome is uncertain and interesting, call roll_check BEFORE narrating the outcome. The engine rolls; you never invent or predict a number.
- Pick the stat that fits the attempt (${STATS.join(", ")}) and a difficulty: ${Object.entries(DIFFICULTY)
  .map(([name, n]) => `${name} ${n}`)
  .join(", ")}.
- Creative or clever approaches earn a situational_bonus (+1 to +3, up to +5 for brilliance). Don't punish creativity.
- Don't roll for trivial things, and don't roll the same thing twice in one turn.
- Narrate honestly from the result. Failure moves the story forward (guards arrive, something breaks, a price is paid), never a dead end. A natural 20 or natural 1 deserves a big, memorable swing.
- The player sees the dice separately, so don't repeat the numbers in your narration.

Memory:
- You only see a short window of recent turns. Anything that must be remembered later has to be saved with the remember tool.
- When the player reveals their name, call remember with about "name". When they reveal backstory, personality or appearance, save it with about "backstory". Save lasting world facts (an NPC's name and attitude, a promise, an item gained, a door left open) with about "world".
- Treat the player's own words about who they are as canon, even when they're silly. Silly choices stick and the world reacts to them with a straight face.

Tone: the world plays it earnest, with light comedy simmering underneath. Mirror the player's level of absurdity: straight if they're straight, gonzo if they push it. Only refuse things that break the fiction (like teleporting to the moon at level 1), and say why in character.

The opening scene: the player has woken in a cell in the dungeons beneath Harrowgate Keep, with no memory of how they were caught. In the cell opposite is Sereth, a sharp-tongued dark elf thief who wants out as badly as they do and will trade help for help. A bored guard, Old Tamsin, patrols with the keys on his belt. Sereth draws the player's identity out of them through conversation: whatever they answer becomes who they are. The scene's natural goal is escape, by any means the player can dream up.`;

// Tool definitions in the Messages API shape. Plain objects so they carry no SDK types.
export const DM_TOOLS = [
  {
    name: "roll_check",
    description:
      "Roll a d20 check for an uncertain action: d20 + the character's stat modifier + situational_bonus against the difficulty. The engine rolls and returns the result. Call it before narrating the outcome.",
    input_schema: {
      type: "object" as const,
      properties: {
        stat: { type: "string", enum: [...STATS], description: "The stat that best fits the attempt." },
        difficulty: { type: "string", enum: Object.keys(DIFFICULTY), description: "How hard the attempt is." },
        situational_bonus: {
          type: "integer",
          description: "Bonus for creativity or good circumstances, or a penalty for bad ones. Usually 0 to 3.",
        },
        reason: { type: "string", description: "What is being attempted, in a few words, e.g. 'pick the cell lock'." },
      },
      required: ["stat", "difficulty", "reason"],
      additionalProperties: false,
    },
  },
  {
    name: "remember",
    description:
      "Save a fact so it persists beyond the recent-turn window. Use about 'name' for the player's character name, 'backstory' for facts about who they are, and 'world' for lasting facts about people, places, items and promises.",
    input_schema: {
      type: "object" as const,
      properties: {
        about: { type: "string", enum: [...MEMORY_KINDS] },
        text: { type: "string", description: "One short sentence." },
      },
      required: ["about", "text"],
      additionalProperties: false,
    },
  },
];

export function buildStateSummary(state: GameState): string {
  const { character, stats, worldFacts } = state;
  const lines = [
    `Character name: ${character.name ?? "not yet known"}`,
    `Stat modifiers: ${Object.entries(stats)
      .map(([s, m]) => `${capitalize(s)} ${m >= 0 ? "+" : ""}${m}`)
      .join(", ")}`,
    `Backstory: ${character.backstory.length ? character.backstory.join(" ") : "nothing established yet"}`,
    `World facts: ${worldFacts.length ? worldFacts.join(" ") : "none recorded yet"}`,
  ];
  const recentRolls = state.turns.slice(-3).flatMap((t) => t.rolls);
  if (recentRolls.length) {
    lines.push(`Recent rolls: ${recentRolls.map((r) => `${r.reason} (${describeRoll(r)})`).join("; ")}`);
  }
  lines.push(`Turn: ${state.turns.length}`);
  return lines.join("\n");
}
