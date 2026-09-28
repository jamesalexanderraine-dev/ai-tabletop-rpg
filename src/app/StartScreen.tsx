"use client";

import type { GameSummary } from "@/engine/game";
import { archetypeInfo, type Archetype } from "@/engine/progression";
import { ArchetypeCards } from "./ArchetypeCards";

function ago(ms: number): string {
  const minutes = Math.round((Date.now() - ms) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Saved games to continue (when saves live on the server), then the archetype
// choice for someone new.
export function StartScreen({
  saved,
  onContinue,
  onPick,
  busy,
  error,
}: {
  saved: GameSummary[];
  onContinue: (id: string) => void;
  onPick: (archetype: Archetype) => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <main className="game picker">
      {saved.length > 0 && (
        <>
          <h1>Welcome back</h1>
          <ul className="saved-games">
            {saved.map((g) => (
              <li key={g.id}>
                <button type="button" className="saved-game" onClick={() => onContinue(g.id)} disabled={busy}>
                  <span className="saved-name">{g.name ?? "A stranger"}</span>
                  <span className="muted">
                    {archetypeInfo(g.archetype).name} · Level {g.level} · {g.scene}
                  </span>
                  <span className="muted small">
                    {g.turns} turns · {ago(g.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <h1 className={saved.length ? "again" : undefined}>{saved.length ? "Or someone new" : "Who are you?"}</h1>
      <p className="muted">
        You&rsquo;re about to wake in a cell beneath Harrowgate Keep. Choose what kind of person wakes up. Everything
        else about you, you&rsquo;ll decide as you play.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <ArchetypeCards onPick={onPick} busy={busy} />
    </main>
  );
}
