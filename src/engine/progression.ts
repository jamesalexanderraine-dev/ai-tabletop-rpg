// Character progression (see docs/DESIGN.md, "Character and progression").
// Levels come from XP. Each level-up is a player choice made in a menu, validated
// here: skill points, a new spell, a stat raise on even levels and a trait on odd ones.

import { STATS, type Stat } from "./dice";
import type { GameState, Trait } from "./game";

export const MAX_LEVEL = 10;
export const MAX_SKILL_RANK = 3;
export const MAX_STAT = 4;
export const SKILL_POINTS_PER_LEVEL = 2;
export const HP_PER_LEVEL = 3;
export const MP_PER_LEVEL = 3;
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
export const maxMpAt = (level: number) => MP_PER_LEVEL * (level - 1);
export const skillPointsAt = (level: number) => SKILL_POINTS_PER_LEVEL * (level - 1);
export const spellsAt = (level: number) => level - 1;
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
export const SKILLS: SkillInfo[] = [
  { id: "athletics", name: "Athletics", stat: "might", description: "Climbing, swimming, lifting, breaking things." },
  { id: "brawling", name: "Brawling", stat: "might", description: "Fists, headbutts and chairs in a bar fight." },
  { id: "blades", name: "Blades", stat: "agility", description: "Swords, daggers and anything with an edge." },
  { id: "stealth", name: "Stealth", stat: "agility", description: "Sneaking, hiding and not being noticed." },
  { id: "sleight", name: "Sleight of Hand", stat: "agility", description: "Pickpocketing, lockpicking, palming cards." },
  { id: "crafting", name: "Crafting", stat: "wits", description: "Woodwork, repairs and building what you need." },
  { id: "lore", name: "Lore", stat: "wits", description: "History, legends, and knowing which mushroom is which." },
  { id: "survival", name: "Survival", stat: "wits", description: "Tracking, foraging and finding your way." },
  { id: "persuasion", name: "Persuasion", stat: "presence", description: "Honest charm, bargaining and speeches." },
  { id: "deception", name: "Deception", stat: "presence", description: "Lies, disguises and a straight face." },
  { id: "performance", name: "Performance", stat: "presence", description: "Song, story and holding a room." },
  { id: "arcana", name: "Arcana", stat: "spirit", description: "Casting, sensing and understanding magic." },
  { id: "healing", name: "Healing", stat: "spirit", description: "Bandages, herbs and bedside manner." },
  { id: "insight", name: "Insight", stat: "spirit", description: "Reading people and spotting lies." },
  { id: "gambling", name: "Gambling", stat: "luck", description: "Dice, cards and knowing when to fold." },
];

export interface SpellInfo {
  id: string;
  name: string;
  level: number; // the character level needed to learn it
  cost: number; // MP
  description: string;
}

export const SPELLS: SpellInfo[] = [
  { id: "light", name: "Light", level: 2, cost: 1, description: "Make an object glow like a torch for an hour." },
  { id: "mend", name: "Mend", level: 2, cost: 2, description: "Knit a wound (heal 2 to 4 HP) or repair a broken object." },
  { id: "spark", name: "Spark", level: 2, cost: 1, description: "Snap a flame into being: light fuses, scare animals, singe eyebrows." },
  { id: "whisper", name: "Whisper", level: 2, cost: 1, description: "Send a short message only one person you can see will hear." },
  { id: "minor_illusion", name: "Minor Illusion", level: 2, cost: 2, description: "Conjure a small sound or image that fools a casual glance." },
  { id: "feather_step", name: "Feather Step", level: 3, cost: 2, description: "Fall gently, walk on snow without sinking, or leap twice as far." },
  { id: "charm", name: "Charm", level: 3, cost: 3, description: "Make one person see you as a friend for a short while." },
  { id: "shatter", name: "Shatter", level: 3, cost: 3, description: "A ringing blast that breaks locks, glass and thin walls." },
  { id: "speak_with_beasts", name: "Speak with Beasts", level: 4, cost: 2, description: "Hold a conversation with an animal. They may not be good company." },
  { id: "ember_burst", name: "Ember Burst", level: 4, cost: 4, description: "Hurl a burst of fire that engulfs a small group." },
  { id: "unseen", name: "Unseen", level: 5, cost: 4, description: "Turn invisible until you attack or cast again." },
  { id: "stone_speech", name: "Stone Speech", level: 6, cost: 3, description: "Ask walls and floors what they have witnessed." },
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
export const spellInfo = (id: string) => SPELLS.find((s) => s.id === id);
export const traitInfo = (id: string) => TRAITS.find((t) => t.id === id);

export function pendingLevelUps(state: GameState): number {
  return Math.max(0, levelForXp(state.character.xp) - state.character.level);
}

export function learnableSpells(state: GameState, level: number): SpellInfo[] {
  return SPELLS.filter((s) => s.level <= level && !state.character.spells.includes(s.id));
}

export function availableTraits(state: GameState): TraitInfo[] {
  return TRAITS.filter((t) => !state.character.traits.some((owned) => owned.name === t.name));
}

export interface LevelUpChoice {
  skills: Record<string, number>; // points to add per skill
  spell: string | null;
  stat: Stat | null;
  trait: string | null;
}

export interface LevelUpNeeds {
  level: number; // the level being reached
  skillPoints: number;
  spell: boolean;
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
    spell: learnableSpells(state, level).length > 0,
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

  const spells = [...c.spells];
  if (needs.spell) {
    const spell = choice.spell ? spellInfo(choice.spell) : undefined;
    if (!spell || !learnableSpells(state, needs.level).includes(spell)) return { ok: false, error: "Pick a spell to learn." };
    spells.push(spell.id);
  } else if (choice.spell) {
    return { ok: false, error: "There's no spell to learn at this level." };
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
        maxMp: maxMpAt(needs.level),
        mp: c.mp + MP_PER_LEVEL,
        skills,
        spells,
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
    spell: needs.spell ? learnableSpells(state, needs.level)[0]!.id : null,
    stat: needs.stat ? byStat.find((s) => state.stats[s] < MAX_STAT)! : null,
    trait: needs.trait ? availableTraits(state)[0]!.id : null,
  };
}

