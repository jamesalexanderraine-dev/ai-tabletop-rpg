"use client";

import { useEffect, useState, type ReactNode } from "react";
import { capitalize, type GameState } from "@/engine/game";
import { DM_MODELS, type DmModelId } from "@/shared/dmModels";
import {
  abilitiesFor,
  archetypeOf,
  MAX_SKILL_RANK,
  poolOf,
  SKILLS,
  STAT_INFO,
  xpForNextLevel,
  type AbilityInfo,
} from "@/engine/progression";

type Pool = "MP" | "stamina";

export function formatMod(m: number): string {
  return m >= 0 ? `+${m}` : `−${Math.abs(m)}`;
}

export function Meter({ label, value, max, kind }: { label: string; value: number; max: number; kind: "hp" | "mp" | "stamina" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const level = kind !== "hp" ? kind : pct > 50 ? "good" : pct > 20 ? "hurt" : "dire";
  const prefix = kind === "mp" ? "MP " : kind === "stamina" ? "Stamina " : "";
  return (
    <span className={`meter ${level}`} role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <span className="meter-track">
        <span className="meter-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="meter-text">
        {prefix}
        {value}/{max}
      </span>
    </span>
  );
}

// A bottom sheet. Menus never advance time: nothing in here talks to the DM.
export function SheetFrame({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="link" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type Tab = "Character" | "Abilities" | "Pack" | "People";

export function CharacterSheet({
  game,
  onClose,
  onNewGame,
  newGameLabel = "Start a new game",
  busy,
  dmModel,
  onDmModel,
}: {
  game: GameState;
  onClose: () => void;
  onNewGame: () => void;
  newGameLabel?: string;
  busy: boolean;
  dmModel: DmModelId;
  onDmModel: (model: DmModelId) => void;
}) {
  const [tab, setTab] = useState<Tab>("Character");
  const tabs: Array<[Tab, string]> = [
    ["Character", "Character"],
    ["Abilities", poolOf(game.character) === "MP" ? "Spells" : "Abilities"],
    ["Pack", "Pack"],
    ["People", "People"],
  ];
  return (
    <SheetFrame title={game.character.name ?? "A stranger"} onClose={onClose}>
      <nav className="tabs" role="tablist">
        {tabs.map(([t, label]) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "tab on" : "tab"} onClick={() => setTab(t)}>
            {label}
          </button>
        ))}
      </nav>
      {tab === "Character" && <CharacterTab game={game} />}
      {tab === "Abilities" && <AbilitiesTab game={game} />}
      {tab === "Pack" && <PackTab game={game} />}
      {tab === "People" && <PeopleTab game={game} />}
      <DmPicker value={dmModel} onChange={onDmModel} />
      <button type="button" className="link danger" onClick={onNewGame} disabled={busy}>
        {newGameLabel}
      </button>
    </SheetFrame>
  );
}

// Which Claude model runs the DM from the next turn on.
function DmPicker({ value, onChange }: { value: DmModelId; onChange: (model: DmModelId) => void }) {
  return (
    <section className="dm-picker">
      <h3>Dungeon Master</h3>
      <div role="radiogroup" aria-label="Dungeon Master model">
        {DM_MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={value === m.id}
            className={value === m.id ? "dm-option on" : "dm-option"}
            onClick={() => onChange(m.id)}
          >
            <strong>{m.name}</strong>
            <span className="small">{m.blurb}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CharacterTab({ game }: { game: GameState }) {
  const { character: c, stats } = game;
  const next = xpForNextLevel(c.level);
  const trained = SKILLS.filter((s) => (c.skills[s.id] ?? 0) > 0);
  const [showAll, setShowAll] = useState(false);
  return (
    <>
      <p className="sheet-line">
        {archetypeOf(c).name} · Level {c.level} · XP {c.xp}
        {next !== null && <span className="muted"> / {next}</span>}
      </p>
      <p className="sheet-line">
        HP {c.hp}/{c.maxHp} · {poolOf(c) === "MP" ? "MP" : "Stamina"} {c.energy}/{c.maxEnergy}
        {c.conditions.length > 0 && <> · {c.conditions.join(", ")}</>}
      </p>
      <p className="sheet-line muted">{game.scene.name}</p>

      <h3>Stats</h3>
      <ul className="rows">
        {STAT_INFO.map((st) => (
          <li key={st.id}>
            <span>
              {st.name} <strong>{formatMod(stats[st.id])}</strong>
              <br />
              <span className="muted small">{st.description}</span>
            </span>
          </li>
        ))}
      </ul>

      <h3>Skills</h3>
      {trained.length === 0 && !showAll && <p className="muted">None trained yet. You earn skill points when you level up.</p>}
      <ul className="rows">
        {(showAll ? SKILLS : trained).map((s) => (
          <li key={s.id}>
            <span>
              {s.name} <span className="muted small">{capitalize(s.stat)}</span>
              <br />
              <span className="muted small">{s.description}</span>
            </span>
            <Pips rank={c.skills[s.id] ?? 0} />
          </li>
        ))}
      </ul>
      <button type="button" className="link small" onClick={() => setShowAll(!showAll)}>
        {showAll ? "Show trained only" : "Show all skills"}
      </button>

      <h3>Traits</h3>
      {c.traits.length ? (
        <ul className="rows">
          {c.traits.map((t) => (
            <li key={t.name}>
              <span>
                <strong>{t.name}</strong>
                <br />
                <span className="small">+ {t.upside}</span>
                <br />
                <span className="small muted">− {t.downside}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">None yet. Traits come from the story, and from leveling up.</p>
      )}

      {c.backstory.length > 0 && (
        <>
          <h3>Who you are</h3>
          <p>{c.backstory.join(" ")}</p>
        </>
      )}
    </>
  );
}

export function Pips({ rank }: { rank: number }) {
  return (
    <span className="pips" aria-label={`Rank ${rank} of ${MAX_SKILL_RANK}`}>
      {Array.from({ length: MAX_SKILL_RANK }, (_, i) => (
        <span key={i} className={i < rank ? "pip on" : "pip"} />
      ))}
    </span>
  );
}

function AbilitiesTab({ game }: { game: GameState }) {
  const [query, setQuery] = useState("");
  const c = game.character;
  const pool = poolOf(c);
  const mage = pool === "MP";
  const q = query.trim().toLowerCase();
  const matches = abilitiesFor(c).filter((a) => !q || `${a.name} ${a.description}`.toLowerCase().includes(q));
  const known = matches.filter((a) => c.abilities.includes(a.id));
  const learnable = matches.filter((a) => !c.abilities.includes(a.id));
  return (
    <>
      <input
        className="search"
        type="search"
        placeholder={mage ? "Search spells" : "Search abilities"}
        aria-label={mage ? "Search spells" : "Search abilities"}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <h3>Known</h3>
      {known.length ? (
        <ul className="rows">
          {known.map((a) => (
            <AbilityRow key={a.id} ability={a} pool={pool} />
          ))}
        </ul>
      ) : (
        <p className="muted">Nothing matches.</p>
      )}
      <h3>Not yet learned</h3>
      <ul className="rows">
        {learnable.map((a) => (
          <AbilityRow key={a.id} ability={a} pool={pool} locked={a.level > c.level} />
        ))}
      </ul>
      <p className="muted small">
        {mage
          ? "To cast, tap \u2726 Spells in the action bar, or just say so in the story: \u201cI cast Spark on the straw.\u201d"
          : "To use one, tap \u2726 Abilities in the action bar, or just do it in the story: \u201cI heave the cart off him.\u201d It costs the same either way."}
      </p>
    </>
  );
}

export function AbilityText({ ability, pool }: { ability: AbilityInfo; pool: Pool }) {
  return (
    <span>
      <strong>{ability.name}</strong>{" "}
      <span className="muted small">
        {ability.cost} {pool}
      </span>
      <br />
      <span className="small">{ability.description}</span>
    </span>
  );
}

function AbilityRow({ ability, pool, locked }: { ability: AbilityInfo; pool: Pool; locked?: boolean }) {
  return (
    <li className={locked ? "locked" : undefined}>
      <AbilityText ability={ability} pool={pool} />
      {locked && <span className="muted small">Lv {ability.level}</span>}
    </li>
  );
}

function PackTab({ game }: { game: GameState }) {
  const { inventory } = game;
  return inventory.length ? (
    <ul className="items">
      {inventory.map((item) => (
        <li key={item.name}>
          {item.name}
          {item.tags.length > 0 && (
            <span className="tags">
              {item.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </span>
          )}
        </li>
      ))}
    </ul>
  ) : (
    <p className="muted">Nothing but lint.</p>
  );
}

function PeopleTab({ game }: { game: GameState }) {
  return (
    <ul className="people">
      {game.npcs.map((n) => (
        <li key={n.name}>
          <strong>{n.name}</strong> {n.role && <span className="speaker-role">{n.role}</span>}{" "}
          <span className={`attitude ${n.attitude}`}>{n.attitude}</span>
          <br />
          <span className="muted">{n.note}</span>
        </li>
      ))}
    </ul>
  );
}
