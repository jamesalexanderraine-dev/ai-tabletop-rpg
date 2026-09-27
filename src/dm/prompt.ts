// The DM's persona, tool definitions and per-turn state summary.
// Kept free of SDK imports so tests and other DM implementations can share it.

import { DIFFICULTY, STATS } from "@/engine/dice";
import { ATTITUDES, capitalize, describeRoll, STORY_SUMMARY_EVERY, type GameState } from "@/engine/game";
import { MAX_HP_CHANGE, MAX_XP_GAIN } from "@/engine/tools";

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

The world is stored in code, not in your memory. You only see a short window of recent turns plus the game state below, so anything that should last must go through a tool, in the same turn it happens:
- Items gained, made, stolen or worn: add_item, with free-form tags (e.g. a loaf of bread worn as a hat: "Bread hat", tags edible, ridiculous, worn). Items used up, given away or lost: remove_item. Only the player's inventory counts; if they try to use something they don't have, the engine will say so, and you narrate accordingly.
- Harm, healing, conditions and XP: update_character. Typical hits cost 1 to 4 HP. Award XP for clever play and milestones (5 to 25). At 0 HP the character is down, not dead: choose a consequence that fits the stakes (fleeing, capture, a lasting wound).
- Named characters: spawn_npc the first time someone matters, update_npc when their attitude shifts (${ATTITUDES.join(", ")}). NPCs react to what's in the state, including anything ridiculous the player is wearing.
- World facts that should persist (a promise, a door left open, a favour owed): set_flag.
- Going somewhere new: move_scene, with a short description of the new place.
- The player's name and who they are: remember (about "name" or "backstory"). Treat their own words about themselves as canon, even when they're silly.
- When the state says the story summary is due, call update_story with a fresh "story so far" (a few sentences covering everything important, including older events).

Tone: the world plays it earnest, with light comedy simmering underneath. Mirror the player's level of absurdity: straight if they're straight, gonzo if they push it. Silly choices stick and the world reacts to them with a straight face. Only refuse things that break the fiction (like teleporting to the moon at level 1), and say why in character.

The opening scene: the player has woken in a cell in the dungeons beneath Harrowgate Keep, with no memory of how they were caught and nothing in their pockets. In the cell opposite is Sereth, a sharp-tongued dark elf thief who wants out as badly as they do and will trade help for help. A bored guard, Old Tamsin, patrols with the keys on his belt. Sereth draws the player's identity out of them through conversation: whatever they answer becomes who they are. The scene's natural goal is escape, by any means the player can dream up.`;

const nameProp = { type: "string", description: "Name, as it should appear to the player." };

// Tool definitions in the Messages API shape. Plain objects so they carry no SDK types.
function tool(name: string, description: string, properties: Record<string, unknown>, required: string[]) {
  return {
    name,
    description,
    input_schema: { type: "object" as const, properties, required, additionalProperties: false },
  };
}

export const DM_TOOLS = [
  tool(
    "roll_check",
    "Roll a d20 check for an uncertain action: d20 + the character's stat modifier + situational_bonus against the difficulty. The engine rolls and returns the result. Call it before narrating the outcome.",
    {
      stat: { type: "string", enum: [...STATS], description: "The stat that best fits the attempt." },
      difficulty: { type: "string", enum: Object.keys(DIFFICULTY), description: "How hard the attempt is." },
      situational_bonus: {
        type: "integer",
        description: "Bonus for creativity or good circumstances, or a penalty for bad ones. Usually 0 to 3.",
      },
      reason: { type: "string", description: "What is being attempted, in a few words, e.g. 'pick the cell lock'." },
    },
    ["stat", "difficulty", "reason"],
  ),
  tool(
    "remember",
    "Save the player character's name, or a fact about who they are (backstory, personality, appearance).",
    {
      about: { type: "string", enum: ["name", "backstory"] },
      text: { type: "string", description: "The name, or one short sentence of backstory." },
    },
    ["about", "text"],
  ),
  tool(
    "update_character",
    "Change the player character's HP, XP or conditions. Include only the fields that change.",
    {
      hp_change: { type: "integer", description: `Negative for harm, positive for healing (-${MAX_HP_CHANGE} to ${MAX_HP_CHANGE}).` },
      xp_gain: { type: "integer", description: `XP earned (0 to ${MAX_XP_GAIN}).` },
      add_conditions: { type: "array", items: { type: "string" }, description: "e.g. bleeding, soaked, drunk, disguised." },
      remove_conditions: { type: "array", items: { type: "string" } },
    },
    [],
  ),
  tool(
    "add_item",
    "Put an item in the player's inventory. Tags are free-form traits the world can react to.",
    {
      name: nameProp,
      tags: { type: "array", items: { type: "string" }, description: "Up to 6 short tags, e.g. edible, ridiculous, worn." },
    },
    ["name", "tags"],
  ),
  tool("remove_item", "Take an item out of the player's inventory (used up, lost, given away).", { name: nameProp }, ["name"]),
  tool(
    "set_flag",
    "Record a lasting world fact, or clear one with value null.",
    {
      key: { type: "string", description: "Short snake_case key, e.g. mayor_owes_favour." },
      value: { type: ["string", "null"], description: "The fact in a sentence, or null to clear it." },
    },
    ["key", "value"],
  ),
  tool(
    "spawn_npc",
    "Introduce a named character the story will come back to.",
    {
      name: nameProp,
      attitude: { type: "string", enum: [...ATTITUDES], description: "How they feel about the player." },
      note: { type: "string", description: "Who they are and what they want, in one sentence." },
    },
    ["name", "attitude", "note"],
  ),
  tool(
    "update_npc",
    "Change a known character's attitude toward the player, or their note.",
    {
      name: nameProp,
      attitude: { type: "string", enum: [...ATTITUDES] },
      note: { type: "string", description: "Replaces the old note." },
    },
    ["name"],
  ),
  tool(
    "move_scene",
    "Move the player to a new location.",
    {
      name: { type: "string", description: "The place's name, e.g. 'The Drowned Lantern tavern'." },
      description: { type: "string", description: "What's there, in one or two sentences." },
    },
    ["name", "description"],
  ),
  tool(
    "update_story",
    "Rewrite the 'story so far' summary. Call it when the game state says it's due.",
    { summary: { type: "string", description: "A few sentences covering everything important so far." } },
    ["summary"],
  ),
];

function list(items: string[], empty: string): string {
  return items.length ? items.join("; ") : empty;
}

export function buildStateSummary(state: GameState): string {
  const { character: c, stats, inventory, npcs, flags, scene, story } = state;
  const lines = [
    `Character: ${c.name ?? "name not yet known"}. HP ${c.hp}/${c.maxHp}. XP ${c.xp}. Conditions: ${c.conditions.join(", ") || "none"}.`,
    `Stat modifiers: ${Object.entries(stats)
      .map(([s, m]) => `${capitalize(s)} ${m >= 0 ? "+" : ""}${m}`)
      .join(", ")}`,
    `Backstory: ${c.backstory.length ? c.backstory.join(" ") : "nothing established yet"}`,
    `Inventory: ${list(inventory.map((i) => (i.tags.length ? `${i.name} (${i.tags.join(", ")})` : i.name)), "empty")}`,
    `Scene: ${scene.name}. ${scene.description}`,
    `Known characters: ${list(npcs.map((n) => `${n.name}, ${n.attitude}: ${n.note}`), "none yet")}`,
    `World flags: ${list(Object.entries(flags).map(([k, v]) => `${k}: ${v}`), "none")}`,
  ];
  if (story.summary) lines.push(`Story so far (as of turn ${story.turn}): ${story.summary}`);
  const recentRolls = state.turns.slice(-3).flatMap((t) => t.rolls);
  if (recentRolls.length) {
    lines.push(`Recent rolls: ${recentRolls.map((r) => `${r.reason} (${describeRoll(r)})`).join("; ")}`);
  }
  lines.push(`Turn: ${state.turns.length}`);
  if (state.turns.length - story.turn >= STORY_SUMMARY_EVERY) {
    lines.push("The story summary is due: call update_story this turn.");
  }
  return lines.join("\n");
}
