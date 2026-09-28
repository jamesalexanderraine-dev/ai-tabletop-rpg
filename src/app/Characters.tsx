"use client";

import { useEffect, useState } from "react";
import type { GameSummary } from "@/engine/game";
import { SavedGameList } from "./SavedGames";
import { SheetFrame } from "./Sheet";
import { listGames } from "./saves";

// Swap between saved characters mid-game. Everything is saved on the server
// after every turn, so switching never loses anything.
export function CharacterSwitcher({
  currentId,
  onSwitch,
  onNew,
  onDelete,
  onClose,
  busy,
  error,
}: {
  currentId: string | null;
  onSwitch: (id: string) => void;
  onNew: () => void;
  onDelete: (game: GameSummary) => Promise<boolean>;
  onClose: () => void;
  busy: boolean;
  error: string | null;
}) {
  const [games, setGames] = useState<GameSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listGames()
      .then(setGames)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Couldn't load your characters."));
  }, []);

  async function remove(game: GameSummary) {
    if (await onDelete(game)) setGames((gs) => gs?.filter((g) => g.id !== game.id) ?? gs);
  }

  const shownError = error ?? loadError;
  return (
    <SheetFrame title="Characters" onClose={onClose}>
      {shownError && (
        <p className="error" role="alert">
          {shownError}
        </p>
      )}
      {games === null ? (
        !loadError && <p className="muted">Gathering your characters&hellip;</p>
      ) : (
        <SavedGameList
          games={games}
          currentId={currentId}
          onOpen={(id) => (id === currentId ? onClose() : onSwitch(id))}
          onDelete={(g) => void remove(g)}
          busy={busy}
        />
      )}
      <button type="button" className="confirm new-character" onClick={onNew} disabled={busy}>
        New character
      </button>
    </SheetFrame>
  );
}
