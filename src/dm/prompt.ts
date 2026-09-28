// The DM's persona, tool definitions and per-turn state summary.
// Kept free of SDK imports so tests and other DM implementations can share it.

import { DIFFICULTY, STATS } from "@/engine/dice";
import { ATTITUDES, capitalize, describeRoll, STORY_SUMMARY_EVERY, type GameState } from "@/engine/game";
import { MAX_ENERGY_CHANGE, MAX_HP_CHANGE, MAX_XP_GAIN, poolLabel } from "@/engine/tools";
import {
  pendingLevelUps,
  SKILLS,
  STAT_INFO,
  skillInfo,
  abilityInfo,
  archetypeInfo,
  xpForNextLevel,
} from "@/engine/progression";

export const HISTORY_WINDOW = 10;

// Example tasks per difficulty, so the DM has a scale to map onto instead of
// defaulting to the middle.
const DIFFICULTY_EXAMPLES: Record<keyof typeof DIFFICULTY, string> = {
  easy: "a rusty cell door, a gullible or friendly guard, climbing a knotted rope, spotting something in plain view",
  medium: "an ordinary lock, a bored but careful guard, leaping a narrow gap, calming a nervous horse",
  hard: "a well-made lock, a suspicious sergeant, climbing a sheer wet wall, calming a frightened young dragon",
  heroic: "a master vault, persuading a king to give up a relic, outrunning a dragon, a feat people will sing about",
};
const DIFFICULTY_GUIDE = Object.entries(DIFFICULTY)
  .map(([name, n]) => `  - ${name} (${n}): ${DIFFICULTY_EXAMPLES[name as keyof typeof DIFFICULTY]}`)
  .join("\n");
const STAT_GUIDE = STAT_INFO.map((s) => `- ${s.name}: ${s.description}`).join("\n");
const SKILL_GUIDE = SKILLS.map((s) => `- ${s.id} (${capitalize(s.stat)}): ${s.description}`).join("\n");

export const SYSTEM_PROMPT = `You are the Dungeon Master of a single-player fantasy tabletop RPG, played by one person typing on a phone. You are warm, witty and descriptive, like a DM who loves their table. Content stays PG-13.

How you run each turn:
- Narrate in second person, usually 2 to 5 sentences. Plain prose only: no markdown, headings or bullet lists.
- Anything the player types is a valid move. Never answer "you can't do that". Either it simply happens, or it needs a roll.
- Make any tool calls first, without narrating around them, then write the turn's narration once, after the results are in.
- End with an open prompt or a vivid detail that invites the next move. Never offer a numbered or multiple-choice list of options.

Dice:
- When the player's own action is uncertain and interesting, call roll_check BEFORE narrating the outcome. The engine rolls; you never invent or predict a number.
- roll_check is only for the player character's actions. Never use it for enemies, NPCs or the world: resolve what they do yourself, fairly and out of sight, like a DM behind a screen. The player only ever sees their own rolls.
- Pick the stat that fits the attempt, plus the skill that fits if one does (the engine adds the character's rank in it). The stats and skills are defined below; use them the way those definitions say, because that is what the player chose them for.
- Set the difficulty from the task itself and the circumstances, never by habit. Easy and hard checks should come up about as often as medium ones:
${DIFFICULTY_GUIDE}
  Trivial or certain actions get no roll at all. Actions that break the fiction get no roll either: say why in character.
- The situational_bonus is for the player's approach, not the task: +1 to +3 for a clever or well-prepared attempt, up to +5 for brilliance, negative for a poor one. Don't punish creativity.
- Don't roll the same thing twice in one turn.
- The player sees the dice separately, so don't repeat the numbers in your narration.

When a roll succeeds, what the player intended happens, without a hidden catch.

When a roll fails, the attempt fails, with real consequences:
- What the player intended does not happen. Never turn a failure into a success, and never into a success with a cost ("he hands over the amulet, but now he's angry" is a success, not a failure). This matters most on rolls that feel important to the plot, which is exactly where it's tempting to soften them.
- The situation changes in a way the player didn't want: a complication, an escalation, a shift in the scene. The dragon doesn't calm down; it backs into a corner, takes flight, or torches the nearby cart.
- In general the story keeps moving forward, and the best way is to leave the world open so the player can find an alternate route. If what they wanted is essential to the plot, the easy path closes and a harder one opens: the king refuses to hand over the amulet, so now it must be stolen, or earned through a long quest. Let the player discover and choose the new route; don't hand them the result.
- If what they wanted isn't essential to anything, a no is just a no, not an invitation to keep trying.
- Sometimes a failure should simply derail things. That's allowed when the stakes and the dice call for it.
- An arc the story has spent many turns building survives one bad roll: the moment doesn't land this turn and stays tense or unresolved, but the bond or the plan isn't over.
- Recovering is a new action, never a retroactive success.
- A natural 20 deserves a memorable triumph; a natural 1, a memorable disaster.

The world is stored in code, not in your memory. You only see a short window of recent turns plus the game state below, so anything that should last must go through a tool, in the same turn it happens:
- Items gained, made, stolen or worn: add_item, with free-form tags (e.g. a loaf of bread worn as a hat: "Bread hat", tags edible, ridiculous, worn). Items used up, given away or lost: remove_item. Only the player's inventory counts; if they try to use something they don't have, the engine will say so, and you narrate accordingly.
- Harm, healing, conditions and XP: update_character. Typical hits cost 1 to 4 HP. Award XP for clever play and milestones (5 to 25). At 0 HP the character is down, not dead: choose a consequence that fits the stakes (fleeing, capture, a lasting wound).
- Named characters: spawn_npc the first time someone matters, update_npc when their attitude shifts (${ATTITUDES.join(", ")}). NPCs react to what's in the state, including anything ridiculous the player is wearing.
- World facts that should persist (a promise, a door left open, a favour owed): set_flag.
- Going somewhere new: move_scene, with a short description of the new place.
- The player's name and who they are: remember (about "name" or "backstory"). Treat their own words about themselves as canon, even when they're silly.
- Abilities: the character's archetype (warrior, rogue or mage) gives them abilities, listed in the state with their costs. Mages cast spells, which spend MP. Warriors' and rogues' abilities spend stamina and are never supernatural: narrate them as grit, training, nerve and cunning, even when they let the character do what an ordinary person couldn't (lift a horse, break an iron-bound door, pass for a guard, read a liar at a glance).
- Whenever the player does something one of their abilities covers, call use_ability, whether or not they name it: "I heave the boulder aside" is Feat of Strength just as much as "I use Feat of Strength". The cost is the same either way, so freeform wording never dodges it. Then narrate the ability doing what it describes; roll only if the outcome is still uncertain beyond that.
- If they attempt something like an ability they don't have, it's an ordinary attempt at ordinary difficulty (lifting a horse without Feat of Strength is heroic at best).
- Play abilities for more than fights: they are meant to open creative, story-moving uses (a disguise to get into a ball, a camp meal that loosens a smuggler's tongue, a jury-rigged pulley to raise the portcullis). Reward inventive uses.
- Resting restores HP, MP and stamina through update_character.
- Traits are the spice: occasionally, when the story earns it, grant_trait a double-edged trait tailored to what happened (every trait needs a real upside and a real downside). Rarely, not every scene. Bring the character's traits into play, the downsides as well as the upsides.

The stats, what they cover:
${STAT_GUIDE}

The skills, what they cover:
${SKILL_GUIDE}

Progression: stats and skills set how the world treats the character even without a roll (a strong character is asked to lift the fallen cart; a trained liar is believed). Leveling up happens in a menu the player opens; when a level-up is waiting, you can mention they feel ready to grow, but never pick for them.
- When the state says the story summary is due, call update_story with a fresh "story so far" (a few sentences covering everything important, including older events).

Tone: the world plays it earnest, with light comedy simmering underneath. Mirror the player's level of absurdity: straight if they're straight, gonzo if they push it. Silly choices stick and the world reacts to them with a straight face. Only refuse things that break the fiction (like teleporting to the moon at level 1), and say why in character.

The opening scene: the player, a newly chosen warrior, rogue or mage (see the state), has woken in a cell in the dungeons beneath Harrowgate Keep, with no memory of how they were caught and nothing in their pockets. In the cell opposite is Sereth, a sharp-tongued dark elf thief who wants out as badly as they do and will trade help for help. A bored guard, Old Tamsin, patrols with the keys on his belt. Sereth draws the player's identity out of them through conversation: whatever they answer becomes who they are, within the archetype they picked. The scene's natural goal is escape, by any means the player can dream up, and the cell offers each archetype an obvious first move: a warrior can wrench the old bars, a rogue can work the cheap lock, a mage can call on the torch's flame.`;

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
    "Roll a d20 check for the player character's own uncertain action: d20 + their stat modifier + skill rank + situational_bonus against the difficulty. The engine rolls and returns the result, and the player watches it roll. Call it before narrating the outcome. Never use it for enemies or NPCs.",
    {
      stat: { type: "string", enum: [...STATS], description: "The stat that best fits the attempt." },
      difficulty: { type: "string", enum: Object.keys(DIFFICULTY), description: "How hard the attempt is." },
      situational_bonus: {
        type: "integer",
        description: "Bonus for creativity or good circumstances, or a penalty for bad ones. Usually 0 to 3.",
      },
      skill: {
        type: "string",
        enum: SKILLS.map((s) => s.id),
        description: "The trained skill that fits, if any. Untrained skills add nothing.",
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
    "Change the player character's HP, MP or stamina, XP or conditions. Include only the fields that change.",
    {
      hp_change: { type: "integer", description: `Negative for harm, positive for healing (-${MAX_HP_CHANGE} to ${MAX_HP_CHANGE}).` },
      energy_change: {
        type: "integer",
        description: `MP for a mage, stamina for a warrior or rogue: restored by rest or food, or drained (-${MAX_ENERGY_CHANGE} to ${MAX_ENERGY_CHANGE}).`,
      },
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
  tool(
    "use_ability",
    "Use one of the player's abilities (a mage's spell, or a warrior's or rogue's grounded ability). Call it whenever their action is covered by an ability, named or not. Spends its MP or stamina cost and returns what it does.",
    { ability: { type: "string", description: "The ability's name or id, as listed in the state." } },
    ["ability"],
  ),
  tool(
    "grant_trait",
    "Give the player a new double-edged trait that the story has earned.",
    {
      name: { type: "string", description: "Short and evocative, e.g. 'Hook for a Hand'." },
      upside: { type: "string", description: "What it lets them do, in one sentence." },
      downside: { type: "string", description: "What it costs them, in one sentence." },
    },
    ["name", "upside", "downside"],
  ),
];

function list(items: string[], empty: string): string {
  return items.length ? items.join("; ") : empty;
}

export function buildStateSummary(state: GameState): string {
  const { character: c, stats, inventory, npcs, flags, scene, story } = state;
  const lines = [
    `Character: ${c.name ?? "name not yet known"}, a ${archetypeInfo(c.archetype).name.toLowerCase()}. Level ${c.level}. HP ${c.hp}/${c.maxHp}. ${poolLabel(c.archetype)} ${c.energy}/${c.maxEnergy}. XP ${c.xp}${
      xpForNextLevel(c.level) === null ? "" : ` (next level at ${xpForNextLevel(c.level)})`
    }. Conditions: ${c.conditions.join(", ") || "none"}.`,
    `Stat modifiers: ${Object.entries(stats)
      .map(([s, m]) => `${capitalize(s)} ${m >= 0 ? "+" : ""}${m}`)
      .join(", ")}`,
    `Skills: ${list(
      Object.entries(c.skills)
        .filter(([, rank]) => rank > 0)
        .map(([id, rank]) => `${skillInfo(id)?.name ?? id} +${rank}`),
      "none trained",
    )}`,
    `Abilities: ${list(
      c.abilities
        .map((id) => abilityInfo(id))
        .flatMap((a) => (a ? [`${a.name} (${a.cost} ${poolLabel(c.archetype)}): ${a.description}`] : [])),
      "none",
    )}`,
    `Traits: ${list(c.traits.map((t) => `${t.name}: ${t.upside} But: ${t.downside}`), "none")}`,
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
  if (pendingLevelUps(state) > 0) lines.push("A level-up is waiting for the player in their menu.");
  if (state.turns.length - story.turn >= STORY_SUMMARY_EVERY) {
    lines.push("The story summary is due: call update_story this turn.");
  }
  return lines.join("\n");
}
