// Server-side saves (see docs/DESIGN.md, "Technical architecture": JSON per game
// in a small database). Server-only: never import this from a client component,
// since it reads the database token.
//
// The database is Upstash Redis, connected through Vercel's Storage tab, which
// sets the REST URL and token below. Without them the game still works, saving
// in the browser as before.

import { parseGameState, summarizeGame, type GameState, type GameSummary } from "@/engine/game";

export interface GameStore {
  list(): Promise<GameSummary[]>;
  get(id: string): Promise<GameState | null>;
  put(id: string, state: GameState): Promise<GameSummary>;
}

export const GAME_ID = /^[a-z0-9]{12}$/;
const MAX_LISTED = 50;

export function newGameId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

// Upstash's REST API: one JSON array per command, a Bearer token for auth.
type RedisCommand = (string | number)[];
type Send = (commands: RedisCommand[]) => Promise<unknown[]>;

export function redisStore(url: string, token: string, fetchImpl: typeof fetch = fetch): GameStore {
  const send: Send = async (commands) => {
    const response = await fetchImpl(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Save storage answered ${response.status}.`);
    const results = (await response.json()) as { result?: unknown; error?: string }[];
    const failed = results.find((r) => r.error);
    if (failed) throw new Error(`Save storage error: ${failed.error}`);
    return results.map((r) => r.result);
  };

  return {
    async list() {
      const [ids] = await send([["ZRANGE", "games", 0, MAX_LISTED - 1, "REV"]]);
      if (!Array.isArray(ids) || ids.length === 0) return [];
      const metas = await send(ids.map((id) => ["GET", `game-meta:${id}`]));
      return metas.flatMap((m) => {
        if (typeof m !== "string") return [];
        try {
          return [JSON.parse(m) as GameSummary];
        } catch {
          return [];
        }
      });
    },
    async get(id) {
      if (!GAME_ID.test(id)) return null;
      const [raw] = await send([["GET", `game:${id}`]]);
      if (typeof raw !== "string") return null;
      try {
        return parseGameState(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    async put(id, state) {
      const summary = summarizeGame(id, state, Date.now());
      await send([
        ["SET", `game:${id}`, JSON.stringify(state)],
        ["SET", `game-meta:${id}`, JSON.stringify(summary)],
        ["ZADD", "games", summary.updatedAt, id],
      ]);
      return summary;
    },
  };
}

// For tests and local development: saves live as long as the process does.
export function memoryStore(): GameStore {
  const games = new Map<string, { state: GameState; summary: GameSummary }>();
  return {
    async list() {
      return [...games.values()].map((g) => g.summary).sort((a, b) => b.updatedAt - a.updatedAt);
    },
    async get(id) {
      const game = games.get(id);
      return game ? (JSON.parse(JSON.stringify(game.state)) as GameState) : null;
    },
    async put(id, state) {
      const updatedAt = Math.max(Date.now(), (games.get(id)?.summary.updatedAt ?? 0) + 1);
      const summary = summarizeGame(id, state, updatedAt);
      games.set(id, { state: JSON.parse(JSON.stringify(state)) as GameState, summary });
      return summary;
    },
  };
}

let override: GameStore | null | undefined;

// Tests swap in a memory store; undefined restores the real configuration.
export function setGameStoreForTests(store: GameStore | null | undefined) {
  override = store;
}

// The configured store, or null when no database is connected (browser saves).
// Vercel's Upstash integration names its variables KV_REST_API_*; a database
// created on Upstash directly uses UPSTASH_REDIS_REST_*.
export function gameStore(): GameStore | null {
  if (override !== undefined) return override;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? redisStore(url.trim(), token.trim()) : null;
}
