"use client";

import type { GameSummary } from "@/engine/game";
import type { BuiltInArchetype, CustomArchetype } from "@/engine/progression";
import { ArchetypeCards } from "./ArchetypeCards";
import { SavedGameList } from "./SavedGames";

// Saved games to continue (when saves live on the server), then the archetype
// choice for someone new.
export function StartScreen({
  saved,
  onContinue,
  onDelete,
  onPick,
  busy,
  error,
}: {
  saved: GameSummary[];
  onContinue: (id: string) => void;
  onDelete: (game: GameSummary) => void;
  onPick: (choice: BuiltInArchetype | CustomArchetype) => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <main className="game picker">
      {saved.length > 0 && (
        <>
          <h1>Welcome back</h1>
          <SavedGameList games={saved} onOpen={onContinue} onDelete={onDelete} busy={busy} />
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
