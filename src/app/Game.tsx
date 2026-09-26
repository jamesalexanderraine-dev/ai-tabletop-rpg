"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  capitalize,
  MAX_PLAYER_INPUT_LENGTH,
  type Change,
  newGame,
  parseGameState,
  type GameState,
  type Roll,
  type Turn,
} from "@/engine/game";

const SAVE_KEY = "aidm.game.v1";

// Browser saves are a convenience until Milestone 2 moves saves to the server.
function loadGame(): GameState {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) return parseGameState(JSON.parse(saved)) ?? newGame();
  } catch {
    // Unreadable or blocked storage: start fresh.
  }
  return newGame();
}

function saveGame(game: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  } catch {
    // Storage full or blocked: the game still plays, it just won't survive a reload.
  }
}

export default function Game() {
  const [game, setGame] = useState<GameState | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingInput, setPendingInput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [packOpen, setPackOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setGame(loadGame()), []);
  useEffect(() => {
    if (game) saveGame(game);
  }, [game]);
  // Show a new reply from its first line, so a long one reads top to bottom.
  const turnCount = game?.turns.length ?? 0;
  useEffect(() => {
    if (turnCount > 1) {
      document.querySelector(".story > .turn:last-of-type")?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [turnCount]);
  useEffect(() => {
    if (pendingInput || error) bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [pendingInput, error]);

  function resizeInput() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const input = draft.trim();
    if (!game || !input || pendingInput) return;
    setPendingInput(input);
    setDraft("");
    setError(null);
    requestAnimationFrame(resizeInput);
    try {
      const response = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: game, input }),
      });
      const data = (await response.json().catch(() => ({}))) as { state?: GameState; error?: string };
      if (!response.ok || !data.state) throw new Error(data.error ?? "The DM didn't answer. Try again.");
      setGame(data.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The DM didn't answer. Try again.");
      setDraft(input);
      requestAnimationFrame(resizeInput);
    } finally {
      setPendingInput(null);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  function startOver() {
    if (!confirm("Start a new game? This one will be lost.")) return;
    setGame(newGame());
    setError(null);
    setDraft("");
    setPackOpen(false);
  }

  if (!game) return <main className="game" />;

  return (
    <main className="game">
      <header className="bar">
        <div className="vitals">
          <span className="who">{game.character.name ?? "A stranger"}</span>
          <HpBar hp={game.character.hp} maxHp={game.character.maxHp} />
          <span className="where">{game.scene.name}</span>
        </div>
        <button type="button" className="pack-button" onClick={() => setPackOpen(true)}>
          Pack
        </button>
      </header>

      <div className="story">
        {game.turns.map((turn, i) => (
          <TurnView key={i} turn={turn} first={i === 0} />
        ))}
        {pendingInput && (
          <section className="turn">
            <p className="player">{pendingInput}</p>
            <p className="thinking">The DM considers this…</p>
          </section>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="compose" onSubmit={send}>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            resizeInput();
          }}
          onKeyDown={onKeyDown}
          placeholder="What do you do?"
          aria-label="What do you do?"
          rows={1}
          maxLength={MAX_PLAYER_INPUT_LENGTH}
          enterKeyHint="send"
        />
        <button type="submit" disabled={!draft.trim() || pendingInput !== null}>
          Go
        </button>
      </form>

      {packOpen && (
        <Pack game={game} onClose={() => setPackOpen(false)} onNewGame={startOver} busy={pendingInput !== null} />
      )}
    </main>
  );
}

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = Math.round((hp / maxHp) * 100);
  const level = pct > 50 ? "good" : pct > 20 ? "hurt" : "dire";
  return (
    <span className={`hp ${level}`} role="meter" aria-label="Health" aria-valuenow={hp} aria-valuemin={0} aria-valuemax={maxHp}>
      <span className="hp-track">
        <span className="hp-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="hp-text">
        {hp}/{maxHp}
      </span>
    </span>
  );
}

// Menus never advance time: the pack only shows code-owned state.
function Pack({ game, onClose, onNewGame, busy }: { game: GameState; onClose: () => void; onNewGame: () => void; busy: boolean }) {
  const { character: c, stats, inventory, npcs, scene } = game;
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Pack" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{c.name ?? "A stranger"}</h2>
          <button type="button" className="link" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="sheet-line">
          HP {c.hp}/{c.maxHp} · XP {c.xp}
          {c.conditions.length > 0 && <> · {c.conditions.join(", ")}</>}
        </p>
        <p className="sheet-line muted">{scene.name}</p>

        <h3>Carrying</h3>
        {inventory.length ? (
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
        )}

        <h3>Stats</h3>
        <p className="stats">
          {Object.entries(stats).map(([s, m]) => (
            <span key={s}>
              {capitalize(s)} <strong>{m >= 0 ? `+${m}` : `\u2212${Math.abs(m)}`}</strong>
            </span>
          ))}
        </p>

        {c.backstory.length > 0 && (
          <>
            <h3>Who you are</h3>
            <p>{c.backstory.join(" ")}</p>
          </>
        )}

        <h3>People</h3>
        <ul className="people">
          {npcs.map((n) => (
            <li key={n.name}>
              <strong>{n.name}</strong> <span className={`attitude ${n.attitude}`}>{n.attitude}</span>
              <br />
              <span className="muted">{n.note}</span>
            </li>
          ))}
        </ul>

        <button type="button" className="link danger" onClick={onNewGame} disabled={busy}>
          Start a new game
        </button>
      </div>
    </div>
  );
}

function TurnView({ turn, first }: { turn: Turn; first: boolean }) {
  return (
    <section className="turn">
      {turn.player && <p className="player">{turn.player}</p>}
      {turn.rolls.map((roll, i) => (
        <RollChip key={i} roll={roll} />
      ))}
      <div className={first ? "narration opening" : "narration"}>
        {turn.narration.split(/\n\s*\n/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      {turn.changes.length > 0 && (
        <ul className="changes">
          {turn.changes.map((change, i) => (
            <ChangeNote key={i} change={change} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RollChip({ roll }: { roll: Roll }) {
  const mods = roll.statModifier + roll.situationalBonus;
  const outcome =
    roll.critical === "success"
      ? "Critical success"
      : roll.critical === "failure"
        ? "Critical failure"
        : roll.success
          ? "Success"
          : "Failure";
  return (
    <p className={`roll ${roll.success ? "win" : "lose"}`}>
      <span className="die" aria-hidden>
        {roll.roll}
      </span>
      <span>
        <strong>{capitalize(roll.stat)}</strong> · {roll.reason}
        <br />
        <span className="math">
          {roll.roll} {mods >= 0 ? "+" : "−"} {Math.abs(mods)} = {roll.total} vs {roll.target} · {outcome}
        </span>
      </span>
    </p>
  );
}

const CHANGE_GLYPHS: Record<Change["kind"], string> = {
  item: "\u25c6",
  vitals: "\u2665",
  npc: "\u263a",
  scene: "\u2691",
  note: "\u2022",
};

function ChangeNote({ change }: { change: Change }) {
  return (
    <li className={`change ${change.kind}`}>
      <span aria-hidden>{CHANGE_GLYPHS[change.kind]}</span> {change.text}
    </li>
  );
}
