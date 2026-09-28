// Character progression (see docs/DESIGN.md, "Character and progression", and
// docs/UPDATES.md, "Onboarding & archetypes"). The player picks an archetype at the
// start; levels come from XP, and each level-up is a player choice made in a menu,
// validated here: skill points, a new ability, a stat raise on even levels and a
// trait on odd ones.

import { STATS, type Stat } from "./dice";
import type { GameState } from "./game";

export const MAX_LEVEL = 10;
export const MAX_SKILL_RANK = 3;
export const MAX_STAT = 4;
export const SKILL_POINTS_PER_LEVEL = 2;
export const HP_PER_LEVEL = 3;
export const ENERGY_PER_LEVEL = 2;
export const BASE_ENERGY = 4;
export const BASE_HP = 10;
export const MAX_TRAITS = 8;

// Total XP needed to reach each level (index 0 is level 1).
export const XP_FOR_LEVEL = [0, 50, 120, 220, 350, 500, 670, 860, 1070, 1300] as const;

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= XP_FOR_LEVEL[level]!) level++;
  return level;
}

export function xpForNextLevel(level: number): number | null {
  return level >= MAX_LEVEL ? null : XP_FOR_LEVEL[level]!;
}

export const maxHpAt = (level: number) => BASE_HP + HP_PER_LEVEL * (level - 1);
// MP for mages, stamina for warriors and rogues: one pool, named by archetype.
export const maxEnergyAt = (level: number) => BASE_ENERGY + ENERGY_PER_LEVEL * (level - 1);
// Skill points earned by leveling, on top of the archetype's starting ranks.
export const skillPointsAt = (level: number) => SKILL_POINTS_PER_LEVEL * (level - 1);
// The archetype's signature ability, plus one per level-up.
export const abilitiesAt = (level: number) => level;
export const statRaisesAt = (level: number) => Math.floor(level / 2);
export const levelTraitsAt = (level: number) => Math.floor((level - 1) / 2);
export const raisesStatAt = (level: number) => level % 2 === 0;
export const picksTraitAt = (level: number) => level >= 3 && level % 2 === 1;

export interface SkillInfo {
  id: string;
  name: string;
  stat: Stat;
  description: string;
}

// A broad, flat list: narrow and earned, and each one opens whole solution paths.
// Each description says what the skill covers and how it shows up in play, so a
// player knows what they're buying (and gets ideas), and the DM applies it the
// same way.
export const SKILLS: SkillInfo[] = [
  { id: "athletics", name: "Athletics", stat: "might", description: "Climbing, swimming, jumping and heavy lifting. Scale the wall, swim the moat, hold up the portcullis." },
  { id: "brawling", name: "Brawling", stat: "might", description: "Fists, grapples and improvised weapons. Win the bar fight, pin a guard, swing a chair." },
  { id: "blades", name: "Blades", stat: "agility", description: "Swords, daggers, axes and anything with an edge. Fight, parry, or cut your way out of a tent." },
  { id: "stealth", name: "Stealth", stat: "agility", description: "Moving unseen and unheard. Slip past guards, tail a mark, hide in plain sight." },
  { id: "sleight", name: "Sleight of Hand", stat: "agility", description: "Quick, careful hands. Pick locks and pockets, palm a card, plant evidence." },
  { id: "crafting", name: "Crafting", stat: "wits", description: "Making and mending things. Repair gear, rig a trap, build a raft (or, given time, a ship)." },
  { id: "lore", name: "Lore", stat: "wits", description: "History, legends, heraldry and old knowledge. Know who built the ruin, what the crest means, which mushroom kills." },
  { id: "survival", name: "Survival", stat: "wits", description: "Wilderness know-how. Track prey, forage, read the weather, find a safe place to camp." },
  { id: "persuasion", name: "Persuasion", stat: "presence", description: "Honest charm, bargaining and speeches. Talk down a fight, haggle a price, rally a crowd." },
  { id: "deception", name: "Deception", stat: "presence", description: "Lies, disguises and a straight face. Bluff past a guard, forge a letter, play a part." },
  { id: "performance", name: "Performance", stat: "presence", description: "Song, story and stagecraft. Hold a room, stage a distraction, earn coin in a tavern." },
  { id: "animals", name: "Animal Handling", stat: "spirit", description: "Calming, training and riding animals. Soothe a spooked horse, win a hound's trust, raise something with wings." },
  { id: "arcana", name: "Arcana", stat: "spirit", description: "Magic, monsters and ancient lore. Cast with more power, identify a curse, know where dragons make their dens." },
  { id: "healing", name: "Healing", stat: "spirit", description: "Medicine, herbs and bedside manner. Stop the bleeding, cure a poison, keep a friend alive." },
  { id: "insight", name: "Insight", stat: "spirit", description: "Reading people. Spot a lie, sense a motive, tell when someone is afraid." },
  { id: "gambling", name: "Gambling", stat: "luck", description: "Games of chance and nerve. Win at dice and cards, spot a cheat, know when to walk away." },
];

export interface StatInfo {
  id: Stat;
  name: string;
  description: string;
}

// What each stat covers, with and without a roll (see docs/DESIGN.md, "Two ways
// stats and skills act").
export const STAT_INFO: StatInfo[] = [
  { id: "might", name: "Might", description: "Strength and toughness. Lifting, breaking and hitting hard; people ask you to move the fallen cart." },
  { id: "agility", name: "Agility", description: "Speed, balance and precision. Dodging, sneaking, quick hands and a good aim." },
  { id: "wits", name: "Wits", description: "Knowledge and sharp thinking. Noticing clues, recalling lore, working out puzzles." },
  { id: "presence", name: "Presence", description: "Force of personality. Persuading, lying, commanding and performing; people listen when you talk." },
  { id: "spirit", name: "Spirit", description: "Willpower, intuition and magic. Casting spells, resisting fear, reading people and beasts." },
  { id: "luck", name: "Luck", description: "Fortune's favour. Games of chance, lucky breaks, and things tending to go your way." },
];

export const statInfo = (id: Stat) => STAT_INFO.find((s) => s.id === id)!;

export const ARCHETYPE_IDS = ["warrior", "rogue", "mage"] as const;
export type BuiltInArchetype = (typeof ARCHETYPE_IDS)[number];
// "custom" is a "Something else" archetype, generated from the player's own
// concept; its whole kit is stored in the save (Character.custom).
export type Archetype = BuiltInArchetype | "custom";

export interface ArchetypeInfo {
  id: Archetype;
  name: string;
  tagline: string;
  pool: "MP" | "stamina";
  stats: Record<Stat, number>; // starting modifiers, 5 points each
  skills: Record<string, number>; // starting ranks
  signature: string; // the ability they start with
  // What the opening scene offers this archetype: who they are through action.
  openingHook: string;
  // Generated archetypes only: the weapon that defines them, taken when they were caught.
  signatureWeapon?: string;
}

export const ARCHETYPES: ArchetypeInfo[] = [
  {
    id: "warrior",
    name: "Warrior",
    tagline: "Strong, stubborn and hard to stop. Solves problems by lifting, breaking or standing in the way of them.",
    pool: "stamina",
    stats: { might: 2, agility: 1, wits: 0, presence: 1, spirit: 0, luck: 1 },
    skills: { brawling: 1, athletics: 1 },
    signature: "feat_of_strength",
    openingHook:
      "The bars of your cell are old iron, rusted at the hinges, and your hands remember what they're capable of.",
  },
  {
    id: "rogue",
    name: "Rogue",
    tagline: "Quick hands, quicker tongue. Gets in, gets out, and gets away with it.",
    pool: "stamina",
    stats: { might: 0, agility: 2, wits: 1, presence: 1, spirit: 0, luck: 1 },
    skills: { sleight: 1, stealth: 1 },
    signature: "makeshift_disguise",
    openingHook:
      "Someone dropped a bent nail in the straw, and the lock on your door is cheap. You've opened cheaper with less.",
  },
  {
    id: "mage",
    name: "Mage",
    tagline: "Learned, curious and a little dangerous. Bends the world with spells that cost more than they look.",
    pool: "MP",
    stats: { might: 0, agility: 0, wits: 2, presence: 1, spirit: 2, luck: 0 },
    skills: { arcana: 1, lore: 1 },
    signature: "spark",
    openingHook:
      "The guttering torch in the corridor keeps catching your eye. You can feel its little flame, and it can feel you.",
  },
];

export const archetypeInfo = (id: BuiltInArchetype) => ARCHETYPES.find((a) => a.id === id)!;

// A "Something else" archetype, generated from the player's concept and held to
// the same budget as the three above (see customArchetype.ts). abilities[0] is
// the signature; the rest are learned by leveling.
export interface CustomArchetype {
  concept: string; // what the player typed
  name: string;
  tagline: string;
  pool: "MP" | "stamina"; // MP only for concepts that are magical by nature
  stats: Record<Stat, number>;
  skills: Record<string, number>;
  signatureWeapon: string;
  openingHook: string;
  abilities: AbilityInfo[];
}

// Anything that has an archetype: a character, or the summary of a saved game.
export interface HasArchetype {
  archetype: Archetype;
  custom?: CustomArchetype;
}

export function archetypeOf(c: HasArchetype): ArchetypeInfo {
  if (c.archetype !== "custom") return archetypeInfo(c.archetype);
  const k = c.custom!;
  return {
    id: "custom",
    name: k.name,
    tagline: k.tagline,
    pool: k.pool,
    stats: k.stats,
    skills: k.skills,
    signature: k.abilities[0]!.id,
    openingHook: k.openingHook,
    signatureWeapon: k.signatureWeapon,
  };
}

// Starting skill ranks count toward the build on top of the points earned by leveling.
export const STARTING_SKILL_POINTS = 2;

export interface AbilityInfo {
  id: string;
  name: string;
  archetypes: Archetype[];
  level: number; // the character level needed to learn it
  cost: number; // MP for mages, stamina for everyone else
  description: string;
}

// Mages cast spells. Warriors and rogues have grounded abilities: nothing
// supernatural, just grit, skill and cunning, and each one is written to open up
// creative uses outside combat as much as in it.
export const ABILITIES: AbilityInfo[] = [
  // Mage spells
  { id: "spark", name: "Spark", archetypes: ["mage"], level: 1, cost: 1, description: "Snap a flame into being: light a fuse or a fire, scare an animal, singe an eyebrow." },
  { id: "light", name: "Light", archetypes: ["mage"], level: 2, cost: 1, description: "Make an object glow like a torch for an hour." },
  { id: "mend", name: "Mend", archetypes: ["mage"], level: 2, cost: 2, description: "Knit a wound (heal 2 to 4 HP) or repair a broken object." },
  { id: "whisper", name: "Whisper", archetypes: ["mage"], level: 2, cost: 1, description: "Send a short message only one person you can see will hear." },
  { id: "minor_illusion", name: "Minor Illusion", archetypes: ["mage"], level: 2, cost: 2, description: "Conjure a small sound or image that fools a casual glance." },
  { id: "feather_step", name: "Feather Step", archetypes: ["mage"], level: 3, cost: 2, description: "Fall gently, walk on snow without sinking, or leap twice as far." },
  { id: "charm", name: "Charm", archetypes: ["mage"], level: 3, cost: 3, description: "Make one person see you as a friend for a short while." },
  { id: "shatter", name: "Shatter", archetypes: ["mage"], level: 3, cost: 3, description: "A ringing blast that breaks locks, glass and thin walls." },
  { id: "speak_with_beasts", name: "Speak with Beasts", archetypes: ["mage"], level: 4, cost: 2, description: "Hold a conversation with an animal. They may not be good company." },
  { id: "ember_burst", name: "Ember Burst", archetypes: ["mage"], level: 4, cost: 4, description: "Hurl a burst of fire that engulfs a small group." },
  { id: "unseen", name: "Unseen", archetypes: ["mage"], level: 5, cost: 4, description: "Turn invisible until you attack or cast again." },
  { id: "stone_speech", name: "Stone Speech", archetypes: ["mage"], level: 6, cost: 3, description: "Ask walls and floors what they have witnessed." },

  // Warrior
  { id: "feat_of_strength", name: "Feat of Strength", archetypes: ["warrior"], level: 1, cost: 2, description: "Lift, hold or haul far more than anyone should: a cart off a trapped man, a horse out of the mud, a boulder from a cave mouth." },
  { id: "sunder", name: "Sunder", archetypes: ["warrior"], level: 2, cost: 2, description: "Break something built to last: a barred door, a chained chest, a wagon axle, a statue's smug nose. Loud, and it stays broken." },
  { id: "battle_cry", name: "Battle Cry", archetypes: ["warrior"], level: 2, cost: 2, description: "A roar that stops a room. Nervous foes falter, frightened friends find their nerve, and a brawl pauses to see who's shouting." },
  { id: "shield_another", name: "Shield Another", archetypes: ["warrior"], level: 3, cost: 2, description: "Put yourself between danger and someone else: take the blow, the arrow or the blame that was meant for them." },
  { id: "unbreakable", name: "Unbreakable", archetypes: ["warrior"], level: 5, cost: 3, description: "Keep going when you should drop: shrug off pain, cold, exhaustion or a bad wound for one crucial push." },

  // Rogue
  { id: "makeshift_disguise", name: "Makeshift Disguise", archetypes: ["rogue"], level: 1, cost: 2, description: "Become someone else with whatever's lying around: a guard's cloak, a cook's apron, a borrowed limp and accent. Holds until someone looks closely." },
  { id: "honeyed_words", name: "Honeyed Words", archetypes: ["rogue"], level: 2, cost: 2, description: "Charm a stranger fast with the right compliment, a shared joke and a well-timed lie. For a while, they'd rather help you than not." },
  { id: "vanish", name: "Vanish", archetypes: ["rogue"], level: 3, cost: 2, description: "Slip out of sight mid-conversation or in a crowd and turn up where nobody expected. People will swear you were just here." },
  { id: "forgers_hand", name: "Forger's Hand", archetypes: ["rogue"], level: 3, cost: 2, description: "Produce a convincing letter, seal, pass or map, given a little time, some ink and something to copy." },
  { id: "start_a_rumour", name: "Start a Rumour", archetypes: ["rogue"], level: 4, cost: 2, description: "Whisper something in the right tavern and by tomorrow half the town believes it. Good for distractions, reputations and revenge." },
  { id: "second_story_work", name: "Second-Story Work", archetypes: ["rogue"], level: 4, cost: 2, description: "Climb where nobody climbs: sheer walls, chimneys, rooftops, a ship's rigging, all without a sound." },
  { id: "perfect_timing", name: "Perfect Timing", archetypes: ["rogue"], level: 5, cost: 3, description: "Turns out you planned for this: you're already holding the key, the rope or the distraction. Say how you set it up." },

  // Warrior and rogue: trades, wits and people
  { id: "hard_stare", name: "Hard Stare", archetypes: ["warrior", "rogue"], level: 2, cost: 1, description: "Scare someone into talking, backing down or stepping aside without laying a finger on them. Works best when they have reason to fear you." },
  { id: "read_a_liar", name: "Read a Liar", archetypes: ["warrior", "rogue"], level: 2, cost: 1, description: "Watch someone talk and know when they're lying, what they're holding back, and who in the room is really in charge." },
  { id: "trackers_eye", name: "Tracker's Eye", archetypes: ["warrior", "rogue"], level: 2, cost: 1, description: "Read the ground like a letter: who passed, how many, how long ago, what they carried, and where they went in a hurry." },
  { id: "camp_cook", name: "Camp Cook", archetypes: ["warrior", "rogue"], level: 2, cost: 1, description: "Turn whatever's to hand into a hot meal that restores a little HP and stamina, loosens tongues around the fire, or wins over a hungry stranger." },
  { id: "field_medic", name: "Field Medic", archetypes: ["warrior", "rogue"], level: 3, cost: 2, description: "Patch someone up under pressure: set a bone, stitch a gash, draw an arrow. Heals 2 to 4 HP and keeps a friend on their feet." },
  { id: "jury_rig", name: "Jury-Rig", archetypes: ["warrior", "rogue"], level: 3, cost: 2, description: "Build something clever from what's lying around: a pulley to raise a gate, a ramp for a cart, a snare, a battering ram from a table." },
  { id: "tame_the_beast", name: "Tame the Beast", archetypes: ["warrior", "rogue"], level: 4, cost: 2, description: "Face down a wild or panicked animal and bring it to heel with steady hands and a steadier stare: a bolting horse, a guard dog, something bigger." },
];

export interface TraitInfo {
  id: string;
  name: string;
  upside: string;
  downside: string;
}

// Double-edged on purpose: the price is what makes a build feel alive.
export const TRAITS: TraitInfo[] = [
  { id: "iron_stomach", name: "Iron Stomach", upside: "You can eat almost anything and shrug off poison.", downside: "Your eating habits alarm polite company." },
  { id: "lucky_fool", name: "Lucky Fool", upside: "When things go badly, they tend to go badly in your favour.", downside: "Trouble seeks you out, even on quiet days." },
  { id: "silver_tongue", name: "Silver Tongue", upside: "Strangers want to believe you.", downside: "People who know you well never quite do." },
  { id: "light_sleeper", name: "Light Sleeper", upside: "Nobody sneaks up on you while you rest.", downside: "You never sleep well; mornings are a struggle." },
  { id: "animal_magnet", name: "Animal Magnet", upside: "Beasts are drawn to you and rarely attack.", downside: "Beasts are drawn to you. All of them. Always." },
  { id: "hothead", name: "Hothead", upside: "You hit hardest when you're angry.", downside: "You get angry easily, and it shows." },
  { id: "bookworm", name: "Bookworm", upside: "You remember everything you have ever read.", downside: "You can't walk past a book without reading it." },
  { id: "famous_face", name: "Famous Face", upside: "Everyone seems to have heard of you.", downside: "Everyone seems to have heard of you." },
];

export const skillInfo = (id: string) => SKILLS.find((s) => s.id === id);
export const abilityInfo = (id: string) => ABILITIES.find((a) => a.id === id);
export const traitInfo = (id: string) => TRAITS.find((t) => t.id === id);

export function pendingLevelUps(state: GameState): number {
  return Math.max(0, levelForXp(state.character.xp) - state.character.level);
}

// Every ability this character's archetype can have.
export function abilitiesFor(c: HasArchetype): AbilityInfo[] {
  if (c.archetype === "custom") return c.custom?.abilities ?? [];
  return ABILITIES.filter((a) => a.archetypes.includes(c.archetype));
}

export const abilityFor = (c: HasArchetype, id: string) => abilitiesFor(c).find((a) => a.id === id);

export function learnableAbilities(state: GameState, level: number): AbilityInfo[] {
  const c = state.character;
  return abilitiesFor(c).filter((a) => a.level <= level && !c.abilities.includes(a.id));
}

// "MP" for magic users, "stamina" for everyone else.
export const poolOf = (c: HasArchetype) => archetypeOf(c).pool;

// What an ability is called for this character: spells for magic users, abilities otherwise.
export const abilityNoun = (c: HasArchetype) => (poolOf(c) === "MP" ? "spell" : "ability");

export function availableTraits(state: GameState): TraitInfo[] {
  return TRAITS.filter((t) => !state.character.traits.some((owned) => owned.name === t.name));
}

export interface LevelUpChoice {
  skills: Record<string, number>; // points to add per skill
  ability: string | null;
  stat: Stat | null;
  trait: string | null;
}

export interface LevelUpNeeds {
  level: number; // the level being reached
  skillPoints: number;
  ability: boolean;
  stat: boolean;
  trait: boolean;
}

// What the next level-up asks the player to choose, or null if none is due.
export function levelUpNeeds(state: GameState): LevelUpNeeds | null {
  if (pendingLevelUps(state) === 0) return null;
  const level = state.character.level + 1;
  const roomInSkills = SKILLS.reduce((room, s) => room + MAX_SKILL_RANK - (state.character.skills[s.id] ?? 0), 0);
  const raisable = STATS.some((s) => state.stats[s] < MAX_STAT);
  return {
    level,
    skillPoints: Math.min(SKILL_POINTS_PER_LEVEL, roomInSkills),
    ability: learnableAbilities(state, level).length > 0,
    stat: raisesStatAt(level) && raisable,
    trait: picksTraitAt(level) && availableTraits(state).length > 0 && state.character.traits.length < MAX_TRAITS,
  };
}

export type LevelUpOutcome = { ok: true; state: GameState } | { ok: false; error: string };

export function applyLevelUp(state: GameState, choice: LevelUpChoice): LevelUpOutcome {
  const needs = levelUpNeeds(state);
  if (!needs) return { ok: false, error: "No level-up is due yet." };
  const c = state.character;

  const skills = { ...c.skills };
  let spent = 0;
  for (const [id, points] of Object.entries(choice.skills)) {
    if (!points) continue;
    if (!skillInfo(id)) return { ok: false, error: `Unknown skill "${id}".` };
    if (!Number.isInteger(points) || points < 0) return { ok: false, error: "Skill points must be whole numbers." };
    skills[id] = (skills[id] ?? 0) + points;
    if (skills[id]! > MAX_SKILL_RANK) return { ok: false, error: `Skills max out at rank ${MAX_SKILL_RANK}.` };
    spent += points;
  }
  if (spent !== needs.skillPoints) return { ok: false, error: `Spend exactly ${needs.skillPoints} skill points.` };

  const abilities = [...c.abilities];
  const noun = abilityNoun(c);
  if (needs.ability) {
    const ability = choice.ability ? abilityFor(c, choice.ability) : undefined;
    if (!ability || !learnableAbilities(state, needs.level).includes(ability)) {
      return { ok: false, error: `Pick a ${noun} to learn.` };
    }
    abilities.push(ability.id);
  } else if (choice.ability) {
    return { ok: false, error: `There's no ${noun} to learn at this level.` };
  }

  const statRaises = { ...c.statRaises };
  if (needs.stat) {
    if (!choice.stat || !STATS.includes(choice.stat)) return { ok: false, error: "Pick a stat to raise." };
    if (state.stats[choice.stat] >= MAX_STAT) return { ok: false, error: `That stat is already at +${MAX_STAT}.` };
    statRaises[choice.stat] = (statRaises[choice.stat] ?? 0) + 1;
  } else if (choice.stat) {
    return { ok: false, error: "Stats rise on even levels only." };
  }

  const traits = [...c.traits];
  if (needs.trait) {
    const trait = choice.trait ? traitInfo(choice.trait) : undefined;
    if (!trait || !availableTraits(state).includes(trait)) return { ok: false, error: "Pick a trait." };
    traits.push({ name: trait.name, upside: trait.upside, downside: trait.downside, source: "level" });
  } else if (choice.trait) {
    return { ok: false, error: "Traits are picked on odd levels from 3." };
  }

  const stats = choice.stat && needs.stat ? { ...state.stats, [choice.stat]: state.stats[choice.stat] + 1 } : state.stats;
  return {
    ok: true,
    state: {
      ...state,
      stats,
      character: {
        ...c,
        level: needs.level,
        maxHp: maxHpAt(needs.level),
        hp: c.hp + HP_PER_LEVEL,
        maxEnergy: maxEnergyAt(needs.level),
        energy: c.energy + ENERGY_PER_LEVEL,
        skills,
        abilities,
        statRaises,
        traits,
      },
    },
  };
}

// "Choose for me": leans into what the character is already good at.
export function autoLevelUpChoice(state: GameState): LevelUpChoice | null {
  const needs = levelUpNeeds(state);
  if (!needs) return null;
  const byStat = [...STATS].sort((a, b) => state.stats[b] - state.stats[a]);
  const skillOrder = [...SKILLS].sort(
    (a, b) =>
      byStat.indexOf(a.stat) - byStat.indexOf(b.stat) ||
      (state.character.skills[a.id] ?? 0) - (state.character.skills[b.id] ?? 0),
  );
  const skills: Record<string, number> = {};
  let left = needs.skillPoints;
  for (const skill of skillOrder) {
    while (left > 0 && (state.character.skills[skill.id] ?? 0) + (skills[skill.id] ?? 0) < MAX_SKILL_RANK) {
      skills[skill.id] = (skills[skill.id] ?? 0) + 1;
      left--;
      if (left > 0) break; // spread points across skills
    }
    if (left === 0) break;
  }
  return {
    skills,
    ability: needs.ability ? learnableAbilities(state, needs.level)[0]!.id : null,
    stat: needs.stat ? byStat.find((s) => state.stats[s] < MAX_STAT)! : null,
    trait: needs.trait ? availableTraits(state)[0]!.id : null,
  };
}

