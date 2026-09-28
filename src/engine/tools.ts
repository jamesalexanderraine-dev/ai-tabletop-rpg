// The DM's tools, engine side. Each one validates the model's proposal and either
// returns the new state (plus what to show the player) or an error the DM can
// re-narrate. Nothing here trusts the model's input.

import { DIFFICULTY, rollCheck, STATS, type Difficulty, type Rng, type Stat } from "./dice";
import {
  ATTITUDES,
  describeRoll,
  isRecord,
  MAX_BACKSTORY_FACTS,
  MAX_CONDITIONS,
  MAX_FACT_LENGTH,
  MAX_FLAG_KEY_LENGTH,
  MAX_FLAGS,
  MAX_ITEMS,
  MAX_NAME_LENGTH,
  MAX_NPCS,
  MAX_ROLLS_PER_TURN,
  MAX_SCENE_DESCRIPTION,
  MAX_SITUATIONAL_BONUS,
  MAX_STORY_SUMMARY,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  type Attitude,
  type Change,
  type GameState,
  type Roll,
} from "./game";
import { abilitiesFor, abilityFor, abilityNoun, MAX_SKILL_RANK, MAX_TRAITS, poolOf, SKILLS } from "./progression";

export const DM_TOOL_NAMES = [
  "roll_check",
  "remember",
  "update_character",
  "add_item",
  "remove_item",
  "set_flag",
  "spawn_npc",
  "update_npc",
  "move_scene",
  "update_story",
  "use_ability",
  "grant_trait",
] as const;
export type DmToolName = (typeof DM_TOOL_NAMES)[number];

export const MAX_HP_CHANGE = 20;
export const MAX_XP_GAIN = 100;
export const MAX_ENERGY_CHANGE = 20;

export interface ToolContext {
  rollsSoFar: number;
  rng?: Rng;
}

export type ToolApplied =
  | { ok: true; state: GameState; message: string; roll?: Roll; change?: Change }
  | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

class InvalidInput extends Error {}

// Field readers that throw InvalidInput with a message the DM can act on.
function text(input: Record<string, unknown>, key: string, max: number): string {
  const v = input[key];
  if (typeof v !== "string" || !v.trim()) throw new InvalidInput(`"${key}" must be non-empty text.`);
  const clean = v.trim().replace(/\s+/g, " ");
  if (clean.length > max) throw new InvalidInput(`"${key}" must be at most ${max} characters.`);
  return clean;
}

function optionalText(input: Record<string, unknown>, key: string, max: number): string | undefined {
  return input[key] === undefined || input[key] === null ? undefined : text(input, key, max);
}

function int(input: Record<string, unknown>, key: string, min: number, max: number): number | undefined {
  const v = input[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    throw new InvalidInput(`"${key}" must be a whole number from ${min} to ${max}.`);
  }
  return v;
}

function labels(input: Record<string, unknown>, key: string, maxCount: number): string[] {
  const v = input[key];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.some((t) => typeof t !== "string")) throw new InvalidInput(`"${key}" must be a list of words.`);
  const clean = [...new Set((v as string[]).map((t) => t.trim().toLowerCase().replace(/\s+/g, " ")).filter(Boolean))];
  if (clean.length > maxCount) throw new InvalidInput(`"${key}" can have at most ${maxCount} entries.`);
  const long = clean.find((t) => t.length > MAX_TAG_LENGTH);
  if (long) throw new InvalidInput(`"${long}" is too long; keep each entry under ${MAX_TAG_LENGTH} characters.`);
  return clean;
}

function oneOf<T extends string>(input: Record<string, unknown>, key: string, options: readonly T[]): T {
  const v = input[key];
  if (typeof v !== "string" || !(options as readonly string[]).includes(v)) {
    throw new InvalidInput(`"${key}" must be one of: ${options.join(", ")}.`);
  }
  return v as T;
}

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// "MP" for magic users, "stamina" for everyone else.
export const poolLabel = poolOf;

export function applyDmTool(state: GameState, name: string, rawInput: unknown, ctx: ToolContext): ToolApplied {
  if (!(DM_TOOL_NAMES as readonly string[]).includes(name)) return fail(`There is no tool called "${name}".`);
  if (!isRecord(rawInput)) return fail(`${name} needs an object of arguments.`);
  try {
    return HANDLERS[name as DmToolName](state, rawInput, ctx);
  } catch (err) {
    if (err instanceof InvalidInput) return fail(`${name}: ${err.message}`);
    throw err;
  }
}

type Handler = (state: GameState, input: Record<string, unknown>, ctx: ToolContext) => ToolApplied;

const HANDLERS: Record<DmToolName, Handler> = {
  roll_check(state, input, ctx) {
    if (ctx.rollsSoFar >= MAX_ROLLS_PER_TURN) {
      return fail(`Only ${MAX_ROLLS_PER_TURN} rolls are allowed per turn. Narrate with the results you have.`);
    }
    const stat = oneOf<Stat>(input, "stat", STATS);
    const difficulty = oneOf<Difficulty>(input, "difficulty", Object.keys(DIFFICULTY) as Difficulty[]);
    const bonus = int(input, "situational_bonus", -MAX_SITUATIONAL_BONUS, MAX_SITUATIONAL_BONUS) ?? 0;
    const reason = text(input, "reason", MAX_FACT_LENGTH);
    const skill =
      input.skill === undefined || input.skill === null ? null : oneOf(input, "skill", SKILLS.map((s) => s.id));
    // An untrained skill is allowed and simply adds nothing.
    const skillBonus = skill ? Math.min(MAX_SKILL_RANK, state.character.skills[skill] ?? 0) : 0;
    const result = rollCheck(
      { statModifier: state.stats[stat], situationalBonus: bonus + skillBonus, difficulty },
      ctx.rng,
    );
    const roll: Roll = { ...result, situationalBonus: bonus, stat, skill, skillBonus, difficulty, reason };
    return { ok: true, state, roll, message: describeRoll(roll) };
  },

  remember(state, input) {
    const about = oneOf(input, "about", ["name", "backstory"] as const);
    if (about === "name") {
      const name = text(input, "text", MAX_NAME_LENGTH);
      return { ok: true, state: { ...state, character: { ...state.character, name } }, message: "Saved." };
    }
    const fact = text(input, "text", MAX_FACT_LENGTH);
    if (state.character.backstory.length >= MAX_BACKSTORY_FACTS) {
      return fail("The backstory is full for now. Skip facts that are already covered.");
    }
    const backstory = [...state.character.backstory, fact];
    return { ok: true, state: { ...state, character: { ...state.character, backstory } }, message: "Saved." };
  },

  update_character(state, input) {
    const hpChange = int(input, "hp_change", -MAX_HP_CHANGE, MAX_HP_CHANGE) ?? 0;
    const energyChange = int(input, "energy_change", -MAX_ENERGY_CHANGE, MAX_ENERGY_CHANGE) ?? 0;
    const xpGain = int(input, "xp_gain", 0, MAX_XP_GAIN) ?? 0;
    const add = labels(input, "add_conditions", MAX_CONDITIONS);
    const remove = labels(input, "remove_conditions", MAX_CONDITIONS);
    if (!hpChange && !energyChange && !xpGain && !add.length && !remove.length) {
      return fail("update_character needs at least one of hp_change, energy_change, xp_gain, add_conditions or remove_conditions.");
    }
    const c = state.character;
    const missing = remove.filter((r) => !c.conditions.includes(r));
    if (missing.length) {
      return fail(`The character doesn't have: ${missing.join(", ")}. Current conditions: ${c.conditions.join(", ") || "none"}.`);
    }
    const conditions = [...c.conditions.filter((x) => !remove.includes(x)), ...add.filter((x) => !c.conditions.includes(x))];
    if (conditions.length > MAX_CONDITIONS) return fail(`At most ${MAX_CONDITIONS} conditions at once. Remove some first.`);

    const hp = Math.min(c.maxHp, Math.max(0, c.hp + hpChange));
    const energy = Math.min(c.maxEnergy, Math.max(0, c.energy + energyChange));
    const pool = poolLabel(c);
    const notes: string[] = [];
    if (hp !== c.hp) notes.push(`HP ${c.hp} → ${hp}`);
    if (energy !== c.energy) notes.push(`${pool} ${c.energy} → ${energy}`);
    if (xpGain) notes.push(`+${xpGain} XP`);
    const gained = conditions.filter((x) => !c.conditions.includes(x));
    if (gained.length) notes.push(`now ${gained.join(", ")}`);
    if (remove.length) notes.push(`no longer ${remove.join(", ")}`);

    const character = { ...c, hp, energy, xp: c.xp + xpGain, conditions };
    const down = hp === 0 ? " The character is at 0 HP and down: choose a consequence (flee, capture, a lasting wound) rather than a clean death." : "";
    return {
      ok: true,
      state: { ...state, character },
      message: `HP ${hp}/${c.maxHp}, ${pool} ${energy}/${c.maxEnergy}, XP ${character.xp}, conditions: ${conditions.join(", ") || "none"}.${down}`,
      change: notes.length ? { kind: "vitals", text: notes.join(" · ") } : undefined,
    };
  },

  add_item(state, input) {
    const name = text(input, "name", MAX_NAME_LENGTH);
    const tags = labels(input, "tags", MAX_TAGS);
    if (state.inventory.some((i) => sameName(i.name, name))) {
      return fail(`The player already has "${name}". Give a new item a distinct name.`);
    }
    if (state.inventory.length >= MAX_ITEMS) return fail("The player can't carry any more. Something has to go first.");
    const item = { name, tags };
    return {
      ok: true,
      state: { ...state, inventory: [...state.inventory, item] },
      message: `Added "${name}".`,
      change: { kind: "item", text: `Gained ${name}${tags.length ? ` (${tags.join(", ")})` : ""}` },
    };
  },

  remove_item(state, input) {
    const name = text(input, "name", MAX_NAME_LENGTH);
    const item = state.inventory.find((i) => sameName(i.name, name));
    if (!item) {
      const carried = state.inventory.map((i) => i.name).join(", ") || "nothing";
      return fail(`The player doesn't have "${name}". They carry: ${carried}.`);
    }
    return {
      ok: true,
      state: { ...state, inventory: state.inventory.filter((i) => i !== item) },
      message: `Removed "${item.name}".`,
      change: { kind: "item", text: `Lost ${item.name}` },
    };
  },

  set_flag(state, input) {
    const key = text(input, "key", MAX_FLAG_KEY_LENGTH)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!key) return fail('"key" needs letters or numbers, e.g. "mayor_owes_favour".');
    const value = input.value === null || input.value === "" ? null : text(input, "value", MAX_FACT_LENGTH);
    const flags = { ...state.flags };
    if (value === null) {
      if (!(key in flags)) return fail(`There is no flag "${key}" to clear.`);
      delete flags[key];
      return { ok: true, state: { ...state, flags }, message: `Cleared "${key}".` };
    }
    if (!(key in flags) && Object.keys(flags).length >= MAX_FLAGS) {
      return fail("World memory is full. Clear a flag that no longer matters first.");
    }
    flags[key] = value;
    return { ok: true, state: { ...state, flags }, message: `Set "${key}".` };
  },

  spawn_npc(state, input) {
    const name = text(input, "name", MAX_NAME_LENGTH);
    const attitude = oneOf<Attitude>(input, "attitude", ATTITUDES);
    const note = text(input, "note", MAX_FACT_LENGTH);
    if (state.npcs.some((n) => sameName(n.name, name))) return fail(`${name} already exists. Use update_npc.`);
    if (state.npcs.length >= MAX_NPCS) return fail("Too many named characters. Reuse an existing one.");
    return {
      ok: true,
      state: { ...state, npcs: [...state.npcs, { name, attitude, note }] },
      message: `${name} added.`,
      change: { kind: "npc", text: `Met ${name} · ${attitude}` },
    };
  },

  update_npc(state, input) {
    const name = text(input, "name", MAX_NAME_LENGTH);
    const npc = state.npcs.find((n) => sameName(n.name, name));
    if (!npc) {
      const known = state.npcs.map((n) => n.name).join(", ") || "nobody yet";
      return fail(`There is no NPC called "${name}". Known: ${known}. Use spawn_npc for someone new.`);
    }
    const attitude = input.attitude === undefined ? npc.attitude : oneOf<Attitude>(input, "attitude", ATTITUDES);
    const note = optionalText(input, "note", MAX_FACT_LENGTH) ?? npc.note;
    const updated = { ...npc, attitude, note };
    return {
      ok: true,
      state: { ...state, npcs: state.npcs.map((n) => (n === npc ? updated : n)) },
      message: `${npc.name} updated.`,
      change:
        attitude !== npc.attitude ? { kind: "npc", text: `${npc.name} · ${npc.attitude} → ${attitude}` } : undefined,
    };
  },

  move_scene(state, input) {
    const name = text(input, "name", MAX_NAME_LENGTH);
    const description = text(input, "description", MAX_SCENE_DESCRIPTION);
    return {
      ok: true,
      state: { ...state, scene: { name, description } },
      message: `Scene is now ${name}.`,
      change: sameName(name, state.scene.name) ? undefined : { kind: "scene", text: name },
    };
  },

  update_story(state, input) {
    const summary = text(input, "summary", MAX_STORY_SUMMARY);
    return {
      ok: true,
      state: { ...state, story: { summary, turn: state.turns.length } },
      message: "Story so far saved.",
    };
  },

  use_ability(state, input) {
    const id = text(input, "ability", MAX_NAME_LENGTH);
    const c = state.character;
    const pool = poolLabel(c);
    const noun = abilityNoun(c);
    const ability =
      abilityFor(c, id) ??
      abilitiesFor(c).find((a) => sameName(a.name, id)) ??
      abilityFor(c, id.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_+|_+$/g, ""));
    const known = c.abilities.map((a) => abilityFor(c, a)?.name ?? a);
    if (!ability || !c.abilities.includes(ability.id)) {
      return fail(
        `The player doesn't have the ${noun} "${id}". Their ${noun === "spell" ? "spells" : "abilities"}: ${known.join(", ") || "none"}. ` +
          "Treat it as an ordinary attempt, with a roll if it's uncertain.",
      );
    }
    if (c.energy < ability.cost) {
      return fail(
        `${ability.name} costs ${ability.cost} ${pool} and the player has ${c.energy}. ` +
          (pool === "MP" ? "The magic sputters out." : "They're too spent to pull it off; narrate them falling short."),
      );
    }
    const energy = c.energy - ability.cost;
    const verb = pool === "MP" ? "Cast" : "Used";
    return {
      ok: true,
      state: { ...state, character: { ...c, energy } },
      message:
        `${ability.name} ${verb.toLowerCase()} (${pool} ${energy}/${c.maxEnergy}). What it does: ${ability.description} ` +
        "It achieves what it describes, even beyond what an ordinary person could manage. Apply any healing or harm with update_character, and roll only if the outcome is still uncertain beyond what the ability covers (then give +2 for it).",
      change: { kind: "spell", text: `${verb} ${ability.name} · −${ability.cost} ${pool}` },
    };
  },

  grant_trait(state, input) {
    const name = text(input, "name", MAX_NAME_LENGTH);
    const upside = text(input, "upside", MAX_FACT_LENGTH);
    const downside = text(input, "downside", MAX_FACT_LENGTH);
    const c = state.character;
    if (c.traits.some((t) => sameName(t.name, name))) return fail(`The player already has the trait "${name}".`);
    if (c.traits.length >= MAX_TRAITS) {
      return fail(`The player already has ${MAX_TRAITS} traits. Make this one an item or a flag instead.`);
    }
    const traits = [...c.traits, { name, upside, downside, source: "story" as const }];
    return {
      ok: true,
      state: { ...state, character: { ...c, traits } },
      message: `Trait "${name}" granted.`,
      change: { kind: "trait", text: `New trait: ${name}` },
    };
  },
};
