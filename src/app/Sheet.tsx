"use client";

import { useEffect, useState, type ReactNode } from "react";
import { capitalize, type GameState } from "@/engine/game";
import { MAX_SKILL_RANK, SKILLS, SPELLS, STAT_INFO, xpForNextLevel } from "@/engine/progression";

export function formatMod(m: number): string {
  return m >= 0 ? `+${m}` : `−${Math.abs(m)}`;
}

export function Meter({ label, value, max, kind }: { label: string; value: number; max: number; kind: "hp" | "mp" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const level = kind === "mp" ? "mp" : pct > 50 ? "good" : pct > 20 ? "hurt" : "dire";
  return (
    <span className={`meter ${level}`} role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <span className="meter-track">
        <span className="meter-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="meter-text">
        {kind === "mp" ? "MP " : ""}
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

const TABS = ["Character", "Spells", "Pack", "People"] as const;
type Tab = (typeof TABS)[number];

export function CharacterSheet({
  game,
  onClose,
  onNewGame,
  busy,
}: {
  game: GameState;
  onClose: () => void;
  onNewGame: () => void;
  busy: boolean;
}) {
  const [tab, setTab] = useState<Tab>("Character");
  return (
    <SheetFrame title={game.character.name ?? "A stranger"} onClose={onClose}>
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "tab on" : "tab"} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      {tab === "Character" && <CharacterTab game={game} />}
      {tab === "Spells" && <SpellsTab game={game} />}
      {tab === "Pack" && <PackTab game={game} />}
      {tab === "People" && <PeopleTab game={game} />}
      <button type="button" className="link danger" onClick={onNewGame} disabled={busy}>
        Start a new game
      </button>
    </SheetFrame>
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
        Level {c.level} · XP {c.xp}
        {next !== null && <span className="muted"> / {next}</span>}
      </p>
      <p className="sheet-line">
        HP {c.hp}/{c.maxHp}
        {c.maxMp > 0 && (
          <>
            {" "}
            · MP {c.mp}/{c.maxMp}
          </>
        )}
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

function SpellsTab({ game }: { game: GameState }) {
  const [query, setQuery] = useState("");
  const c = game.character;
  const q = query.trim().toLowerCase();
  const matches = SPELLS.filter((s) => !q || `${s.name} ${s.description}`.toLowerCase().includes(q));
  const known = matches.filter((s) => c.spells.includes(s.id));
  const learnable = matches.filter((s) => !c.spells.includes(s.id));
  return (
    <>
      <input
        className="search"
        type="search"
        placeholder="Search spells"
        aria-label="Search spells"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <h3>Known</h3>
      {known.length ? (
        <ul className="rows">
          {known.map((s) => (
            <SpellRow key={s.id} spell={s} />
          ))}
        </ul>
      ) : (
        <p className="muted">{c.spells.length ? "No known spells match." : "No spells yet. You learn your first at level 2."}</p>
      )}
      <h3>Not yet learned</h3>
      <ul className="rows">
        {learnable.map((s) => (
          <SpellRow key={s.id} spell={s} locked={s.level > c.level} />
        ))}
      </ul>
      <p className="muted small">To cast, just say so in the story: &ldquo;I cast Mend on my arm.&rdquo;</p>
    </>
  );
}

export function SpellText({ spell }: { spell: (typeof SPELLS)[number] }) {
  return (
    <span>
      <strong>{spell.name}</strong> <span className="muted small">{spell.cost} MP</span>
      <br />
      <span className="small">{spell.description}</span>
    </span>
  );
}

function SpellRow({ spell, locked }: { spell: (typeof SPELLS)[number]; locked?: boolean }) {
  return (
    <li className={locked ? "locked" : undefined}>
      <SpellText spell={spell} />
      {locked && <span className="muted small">Lv {spell.level}</span>}
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
          <strong>{n.name}</strong> <span className={`attitude ${n.attitude}`}>{n.attitude}</span>
          <br />
          <span className="muted">{n.note}</span>
        </li>
      ))}
    </ul>
  );
}
