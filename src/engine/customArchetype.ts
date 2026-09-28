// "Something else" archetypes (docs/UPDATES.md, "Something else → generate a
// bespoke archetype"). The model invents the concept's kit; this file holds it to
// the same budget as the hand-made warrior, rogue and mage, so a generated
// archetype is never accidentally stronger or weaker:
// - 5 stat points, none above +2 (like the three defaults)
// - two starting skills at rank 1
// - a signature ability plus ten more, learned on the same schedule and at the
//   same costs as the defaults' abilities
// The same check runs on a freshly generated archetype and on every save that
// carries one, so the rules can't be sidestepped by editing a save.

import { STATS, type Stat } from "./dice";
import { SKILLS, skillInfo, type AbilityInfo, type CustomArchetype } from "./progression";

export const CUSTOM_STAT_POINTS = 5;
export const CUSTOM_MAX_START_STAT = 2;
export const CUSTOM_STARTING_SKILLS = 2;
// The level each ability unlocks at, signature first. Ten more to learn over nine
// level-ups, so there's still a choice at the end, like the defaults.
export const CUSTOM_ABILITY_LEVELS = [1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5] as const;
// What an ability may cost at each level, matching the hand-made catalog.
export const COST_RANGE: Record<number, [number, number]> = { 1: [1, 2], 2: [1, 2], 3: [2, 3], 4: [2, 4], 5: [3, 4] };

export const MAX_CONCEPT_LENGTH = 200;
const MAX_NAME = 40;
const MAX_TAGLINE = 200;
const MAX_HOOK = 300;
const MAX_WEAPON = 60;
const MIN_DESCRIPTION = 20;
const MAX_DESCRIPTION = 260;

export type CustomOutcome = { ok: true; value: CustomArchetype } | { ok: false; errors: string[] };

// Checks a generated (or saved) archetype against the budget. Ability levels and
// ids are assigned here from their order and names, and costs are pulled into the
// range for their level, so those can't drift; anything else that breaks the rules
// is reported, for the generator to fix.
export function parseCustomArchetype(raw: unknown): CustomOutcome {
  if (!isRecord(raw)) return { ok: false, errors: ["The archetype must be an object."] };
  const errors: string[] = [];
  const text = (key: string, max: number, min = 1): string => {
    const v = raw[key];
    if (typeof v !== "string" || v.trim().length < min || v.trim().length > max) {
      errors.push(`"${key}" must be text of ${min} to ${max} characters.`);
      return "";
    }
    return v.trim();
  };

  const concept = text("concept", MAX_CONCEPT_LENGTH);
  const name = text("name", MAX_NAME);
  const tagline = text("tagline", MAX_TAGLINE);
  const signatureWeapon = text("signatureWeapon", MAX_WEAPON);
  const openingHook = text("openingHook", MAX_HOOK);

  const pool = raw.pool;
  if (pool !== "MP" && pool !== "stamina") errors.push(`"pool" must be "MP" or "stamina".`);

  const stats = {} as Record<Stat, number>;
  const rawStats = isRecord(raw.stats) ? raw.stats : {};
  for (const stat of STATS) {
    const v = rawStats[stat];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > CUSTOM_MAX_START_STAT) {
      errors.push(`Stat "${stat}" must be a whole number from 0 to ${CUSTOM_MAX_START_STAT}.`);
    }
    stats[stat] = typeof v === "number" ? v : 0;
  }
  const total = STATS.reduce((sum, s) => sum + stats[s], 0);
  if (total !== CUSTOM_STAT_POINTS) errors.push(`Stats must add up to exactly ${CUSTOM_STAT_POINTS} (they add up to ${total}).`);

  const skills: Record<string, number> = {};
  const rawSkills = isRecord(raw.skills) ? raw.skills : {};
  for (const [id, rank] of Object.entries(rawSkills)) {
    if (!skillInfo(id)) errors.push(`"${id}" isn't a skill. Use one of: ${SKILLS.map((s) => s.id).join(", ")}.`);
    else if (rank !== 1) errors.push(`Starting skills are rank 1 ("${id}" is ${String(rank)}).`);
    else skills[id] = 1;
  }
  if (Object.keys(rawSkills).length !== CUSTOM_STARTING_SKILLS) {
    errors.push(`Pick exactly ${CUSTOM_STARTING_SKILLS} starting skills.`);
  }

  const rawAbilities = Array.isArray(raw.abilities) ? raw.abilities : [];
  if (rawAbilities.length !== CUSTOM_ABILITY_LEVELS.length) {
    errors.push(`Give exactly ${CUSTOM_ABILITY_LEVELS.length} abilities: the signature, then ten more from simplest to strongest.`);
  }
  const abilities: AbilityInfo[] = [];
  const ids = new Set<string>();
  rawAbilities.slice(0, CUSTOM_ABILITY_LEVELS.length).forEach((a, i) => {
    const level = CUSTOM_ABILITY_LEVELS[i]!;
    const where = i === 0 ? "The signature ability" : `Ability ${i + 1}`;
    if (!isRecord(a) || typeof a.name !== "string" || typeof a.description !== "string") {
      errors.push(`${where} needs a name and a description.`);
      return;
    }
    const abilityName = a.name.trim();
    const description = a.description.trim();
    if (!abilityName || abilityName.length > MAX_NAME) errors.push(`${where}'s name must be 1 to ${MAX_NAME} characters.`);
    if (description.length < MIN_DESCRIPTION || description.length > MAX_DESCRIPTION) {
      errors.push(`${where}'s description must be ${MIN_DESCRIPTION} to ${MAX_DESCRIPTION} characters.`);
    }
    const [min, max] = COST_RANGE[level]!;
    const cost = typeof a.cost === "number" && Number.isFinite(a.cost) ? Math.min(max, Math.max(min, Math.round(a.cost))) : min;
    let id = slug(abilityName) || `ability_${i + 1}`;
    for (let n = 2; ids.has(id); n++) id = `${slug(abilityName)}_${n}`;
    ids.add(id);
    abilities.push({ id, name: abilityName, archetypes: ["custom"], level, cost, description });
  });

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: { concept, name, tagline, pool: pool as "MP" | "stamina", stats, skills, signatureWeapon, openingHook, abilities },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}
