// The browser side of saving. With a database connected ("server"), games live on
// the server and follow the player to any link or device; this browser only
// remembers which one it was playing. Without one ("browser"), the game is kept
// in this browser, as before.

import { parseGameState, type GameState, type GameSummary } from "@/engine/game";
import type { BuiltInArchetype, CustomArchetype, LevelUpChoice } from "@/engine/progression";
import { DEFAULT_DM_MODEL, isDmModelId, type DmModelId } from "@/shared/dmModels";

export type SaveStorage = "server" | "browser";

// Where a browser save lives. Games saved here before server saves existed are
// uploaded once and then kept under BACKUP_KEY, just in case.
const SAVE_KEY = "aidm.game.v1";
const BACKUP_KEY = "aidm.game.v1.uploaded";
const CURRENT_KEY = "aidm.current";
const DM_MODEL_KEY = "aidm.dmModel";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Blocked or full storage: the game still plays, it just won't be remembered here.
  }
}

// Which DM this browser plays with, picked on the sheet.
export function loadDmModel(): DmModelId {
  const saved = read(DM_MODEL_KEY);
  return isDmModelId(saved) ? saved : DEFAULT_DM_MODEL;
}

export function saveDmModel(model: DmModelId) {
  write(DM_MODEL_KEY, model);
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Couldn't reach the game server. Try again.");
  return data;
}

export interface Loaded {
  storage: SaveStorage;
  games: GameSummary[];
  current: { id: string | null; state: GameState } | null;
}

export async function loadSaves(): Promise<Loaded> {
  const { storage, games } = await call<{ storage: SaveStorage; games: GameSummary[] }>("/api/games");
  const local = read(SAVE_KEY);

  if (storage === "browser") {
    const state = local ? safeParse(local) : null;
    return { storage, games: [], current: state ? { id: null, state } : null };
  }

  // A game saved in this browser before server saves existed: upload it once, so
  // it shows up on every link and device from now on.
  if (local) {
    const state = safeParse(local);
    if (state) {
      const created = await call<{ id: string; state: GameState }>("/api/games", {
        method: "POST",
        body: JSON.stringify({ import: state }),
      });
      write(CURRENT_KEY, created.id);
      write(BACKUP_KEY, local);
      write(SAVE_KEY, null);
      const refreshed = await call<{ games: GameSummary[] }>("/api/games");
      return { storage, games: refreshed.games, current: { id: created.id, state: created.state } };
    }
  }

  const currentId = read(CURRENT_KEY);
  if (currentId && games.some((g) => g.id === currentId)) {
    const { state } = await call<{ state: GameState }>(`/api/games/${currentId}`);
    return { storage, games, current: { id: currentId, state } };
  }
  return { storage, games, current: null };
}

function safeParse(raw: string): GameState | null {
  try {
    return parseGameState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function openGame(id: string): Promise<GameState> {
  const { state } = await call<{ state: GameState }>(`/api/games/${id}`);
  write(CURRENT_KEY, id);
  return state;
}

// A new game for Warrior, Rogue or Mage, or for an archetype made with "Something else".
export async function createGame(choice: BuiltInArchetype | CustomArchetype): Promise<{ id: string; state: GameState }> {
  const created = await call<{ id: string; state: GameState }>("/api/games", {
    method: "POST",
    body: JSON.stringify(typeof choice === "string" ? { archetype: choice } : { custom: choice }),
  });
  write(CURRENT_KEY, created.id);
  return created;
}

export async function levelUpOnServer(id: string, choice: LevelUpChoice): Promise<GameState> {
  const { state } = await call<{ state: GameState }>(`/api/games/${id}/level-up`, {
    method: "POST",
    body: JSON.stringify({ choice }),
  });
  return state;
}

export async function deleteGame(id: string): Promise<void> {
  await call(`/api/games/${id}`, { method: "DELETE" });
  if (read(CURRENT_KEY) === id) write(CURRENT_KEY, null);
}

// "Something else": the DM designs an archetype from the player's own words.
export async function designArchetype(concept: string): Promise<CustomArchetype> {
  const { archetype } = await call<{ archetype: CustomArchetype }>("/api/archetypes", {
    method: "POST",
    body: JSON.stringify({ concept }),
  });
  return archetype;
}

export async function listGames(): Promise<GameSummary[]> {
  return (await call<{ games: GameSummary[] }>("/api/games")).games;
}

// Browser mode only: keep the game in this browser.
export function saveInBrowser(state: GameState) {
  write(SAVE_KEY, JSON.stringify(state));
}

// Leave the current game: in server mode it stays saved and listed; in browser
// mode it's gone.
export function leaveGame(storage: SaveStorage) {
  if (storage === "server") write(CURRENT_KEY, null);
  else write(SAVE_KEY, null);
}
