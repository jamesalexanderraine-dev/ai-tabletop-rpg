"use client";

import { useState, type ReactNode } from "react";
import { STATS, type Stat } from "@/engine/dice";
import { capitalize, type GameState } from "@/engine/game";
import {
  applyLevelUp,
  autoLevelUpChoice,
  availableTraits,
  HP_PER_LEVEL,
  learnableSpells,
  levelUpNeeds,
  MAX_SKILL_RANK,
  MAX_STAT,
  MP_PER_LEVEL,
  pendingLevelUps,
  SKILLS,
  type LevelUpChoice,
} from "@/engine/progression";
import { formatMod, Pips, SheetFrame, SpellText } from "./Sheet";

const emptyChoice = (): LevelUpChoice => ({ skills: {}, spell: null, stat: null, trait: null });

// The level-up screen: the storyteller can tap "Choose for me" and carry on,
// the min-maxer can pore over every pick. The engine validates the result.
export function LevelUp({ game, onApply, onClose }: { game: GameState; onApply: (next: GameState) => void; onClose: () => void }) {
  const [choice, setChoice] = useState<LevelUpChoice>(emptyChoice);
  const [error, setError] = useState<string | null>(null);
  const needs = levelUpNeeds(game);
  if (!needs) return null;

  const c = game.character;
  const spent = Object.values(choice.skills).reduce((a, b) => a + b, 0);
  const left = needs.skillPoints - spent;
  const complete = left === 0 && (!needs.spell || choice.spell) && (!needs.stat || choice.stat) && (!needs.trait || choice.trait);

  function adjust(id: string, delta: number) {
    const current = choice.skills[id] ?? 0;
    const next = current + delta;
    if (next < 0 || (delta > 0 && left <= 0) || (c.skills[id] ?? 0) + next > MAX_SKILL_RANK) return;
    setChoice({ ...choice, skills: { ...choice.skills, [id]: next } });
  }

  function confirm() {
    const outcome = applyLevelUp(game, choice);
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    setChoice(emptyChoice());
    setError(null);
    onApply(outcome.state);
    if (pendingLevelUps(outcome.state) === 0) onClose();
  }

  return (
    <SheetFrame title={`Level ${needs.level}`} onClose={onClose}>
      <p className="sheet-line">
        +{HP_PER_LEVEL} max HP, +{MP_PER_LEVEL} max MP
        {pendingLevelUps(game) > 1 && <span className="muted"> · {pendingLevelUps(game) - 1} more level-up after this</span>}
      </p>
      <button type="button" className="auto" onClick={() => setChoice(autoLevelUpChoice(game) ?? emptyChoice())}>
        Choose for me
      </button>

      {needs.skillPoints > 0 && (
        <>
          <h3>
            Skills <span className="count">{left} point{left === 1 ? "" : "s"} left</span>
          </h3>
          <ul className="rows">
            {SKILLS.map((s) => {
              const base = c.skills[s.id] ?? 0;
              const added = choice.skills[s.id] ?? 0;
              return (
                <li key={s.id} className={added ? "picked" : undefined}>
                  <span>
                    {s.name} <span className="muted small">{capitalize(s.stat)}</span>
                    <br />
                    <Pips rank={base + added} />
                  </span>
                  <span className="stepper">
                    <button type="button" aria-label={`Remove a point from ${s.name}`} disabled={!added} onClick={() => adjust(s.id, -1)}>
                      −
                    </button>
                    <button
                      type="button"
                      aria-label={`Add a point to ${s.name}`}
                      disabled={left <= 0 || base + added >= MAX_SKILL_RANK}
                      onClick={() => adjust(s.id, 1)}
                    >
                      +
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {needs.spell && (
        <>
          <h3>Learn a spell</h3>
          <ul className="rows choices" role="radiogroup">
            {learnableSpells(game, needs.level).map((s) => (
              <Choice key={s.id} selected={choice.spell === s.id} onSelect={() => setChoice({ ...choice, spell: s.id })}>
                <SpellText spell={s} />
              </Choice>
            ))}
          </ul>
        </>
      )}

      {needs.stat && (
        <>
          <h3>Raise a stat</h3>
          <div className="stat-picks">
            {STATS.map((s: Stat) => (
              <button
                key={s}
                type="button"
                className={choice.stat === s ? "stat-pick on" : "stat-pick"}
                disabled={game.stats[s] >= MAX_STAT}
                aria-pressed={choice.stat === s}
                onClick={() => setChoice({ ...choice, stat: s })}
              >
                {capitalize(s)}
                <br />
                <strong>
                  {formatMod(game.stats[s])}
                  {choice.stat === s && ` → ${formatMod(game.stats[s] + 1)}`}
                </strong>
              </button>
            ))}
          </div>
        </>
      )}

      {needs.trait && (
        <>
          <h3>Pick a trait</h3>
          <ul className="rows choices" role="radiogroup">
            {availableTraits(game).map((t) => (
              <Choice key={t.id} selected={choice.trait === t.id} onSelect={() => setChoice({ ...choice, trait: t.id })}>
                <span>
                  <strong>{t.name}</strong>
                  <br />
                  <span className="small">+ {t.upside}</span>
                  <br />
                  <span className="small muted">− {t.downside}</span>
                </span>
              </Choice>
            ))}
          </ul>
        </>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="confirm" disabled={!complete} onClick={confirm}>
        Become level {needs.level}
      </button>
    </SheetFrame>
  );
}

// A list row that is one big tap target.
function Choice({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <li
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      className={selected ? "choice on" : "choice"}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect())}
    >
      {children}
    </li>
  );
}
