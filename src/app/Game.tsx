"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  capitalize,
  MAX_PLAYER_INPUT_LENGTH,
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
  }

  if (!game) return <main className="game" />;

  return (
    <main className="game">
      <header className="bar">
        <span className="who">{game.character.name ?? "A stranger"}</span>
        <button type="button" className="link" onClick={startOver} disabled={pendingInput !== null}>
          New game
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
    </main>
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
