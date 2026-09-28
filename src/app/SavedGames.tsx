"use client";

import type { GameSummary } from "@/engine/game";
import { ARCHETYPE_IDS, archetypeInfo, type BuiltInArchetype } from "@/engine/progression";

function ago(ms: number): string {
  const minutes = Math.round((Date.now() - ms) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function archetypeName(g: GameSummary): string {
  if (g.archetypeName) return g.archetypeName;
  return (ARCHETYPE_IDS as readonly string[]).includes(g.archetype) ? archetypeInfo(g.archetype as BuiltInArchetype).name : "Adventurer";
}

// Saved characters to continue or delete. The one being played is marked, and
// can't be deleted from here.
export function SavedGameList({
  games,
  currentId = null,
  onOpen,
  onDelete,
  busy,
}: {
  games: GameSummary[];
  currentId?: string | null;
  onOpen: (id: string) => void;
  onDelete: (game: GameSummary) => void;
  busy: boolean;
}) {
  return (
    <ul className="saved-games">
      {games.map((g) => {
        const current = g.id === currentId;
        return (
          <li key={g.id} className={current ? "current" : undefined}>
            <button type="button" className="saved-game" onClick={() => onOpen(g.id)} disabled={busy} aria-current={current || undefined}>
              <span className="saved-name">
                {g.name ?? "A stranger"}
                {current && <span className="playing">Playing</span>}
              </span>
              <span className="muted">
                {archetypeName(g)} · Level {g.level} · {g.scene}
              </span>
              <span className="muted small">
                {g.turns} {g.turns === 1 ? "turn" : "turns"} · {ago(g.updatedAt)}
              </span>
            </button>
            {!current && (
              <button
                type="button"
                className="link danger delete-save"
                onClick={() => onDelete(g)}
                disabled={busy}
                aria-label={`Delete ${g.name ?? "this stranger"}`}
              >
                Delete
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
