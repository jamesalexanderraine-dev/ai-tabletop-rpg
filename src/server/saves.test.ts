import { describe, expect, it } from "vitest";
import { appendTurn, newGame } from "@/engine/game";
import { GAME_ID, memoryStore, newGameId, redisStore, type GameStore } from "./saves";

// A tiny stand-in for Upstash's REST pipeline: the commands the store uses, in memory.
function fakeUpstash() {
  const strings = new Map<string, string>();
  const sorted = new Map<string, number>();
  const requests: { url: string; auth: string | null; commands: unknown[][] }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const commands = JSON.parse(String(init.body)) as (string | number)[][];
    requests.push({ url, auth: new Headers(init.headers).get("Authorization"), commands });
    const results = commands.map(([cmd, ...args]) => {
      switch (cmd) {
        case "SET":
          strings.set(String(args[0]), String(args[1]));
          return { result: "OK" };
        case "GET":
          return { result: strings.get(String(args[0])) ?? null };
        case "ZADD":
          sorted.set(String(args[2]), Number(args[1]));
          return { result: 1 };
        case "ZRANGE":
          return {
            result: [...sorted.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(Number(args[1]), Number(args[2]) + 1)
              .map(([id]) => id),
          };
        default:
          return { error: `unknown command ${cmd}` };
      }
    });
    return new Response(JSON.stringify(results), { status: 200 });
  }) as unknown as typeof fetch;
  return { fetchImpl, requests };
}

function storeContract(name: string, make: () => GameStore) {
  describe(name, () => {
    it("saves a game, lists it with a summary, and loads it back", async () => {
      const store = make();
      const id = newGameId();
      const game = appendTurn(newGame("warrior"), { player: "I bend the bars", narration: "They groan.", rolls: [], changes: [] });
      const summary = await store.put(id, game);
      expect(summary).toMatchObject({ id, name: null, archetype: "warrior", level: 1, turns: 2 });
      expect(await store.list()).toEqual([summary]);
      expect(await store.get(id)).toEqual(game);
    });

    it("lists the most recently played first", async () => {
      const store = make();
      const [a, b] = [newGameId(), newGameId()];
      await store.put(a, newGame("rogue"));
      await new Promise((r) => setTimeout(r, 5));
      await store.put(b, newGame("mage"));
      await new Promise((r) => setTimeout(r, 5));
      await store.put(a, newGame("rogue"));
      expect((await store.list()).map((g) => g.id)).toEqual([a, b]);
    });

    it("returns null for games that don't exist", async () => {
      expect(await make().get(newGameId())).toBeNull();
    });
  });
}

storeContract("memoryStore", memoryStore);
storeContract("redisStore", () => redisStore("https://example.upstash.io/", "secret", fakeUpstash().fetchImpl));

describe("redisStore", () => {
  it("talks to the pipeline endpoint with the token", async () => {
    const upstash = fakeUpstash();
    await redisStore("https://example.upstash.io", "secret", upstash.fetchImpl).put(newGameId(), newGame("mage"));
    expect(upstash.requests[0]).toMatchObject({ url: "https://example.upstash.io/pipeline", auth: "Bearer secret" });
    expect(upstash.requests[0]!.commands.map((c) => c[0])).toEqual(["SET", "SET", "ZADD"]);
  });

  it("refuses odd ids without asking the database", async () => {
    const upstash = fakeUpstash();
    expect(await redisStore("https://x", "t", upstash.fetchImpl).get("../../etc")).toBeNull();
    expect(upstash.requests).toHaveLength(0);
  });

  it("surfaces storage errors instead of pretending to save", async () => {
    const failing = (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
    await expect(redisStore("https://x", "t", failing).put(newGameId(), newGame("mage"))).rejects.toThrow(/500/);
  });
});

describe("newGameId", () => {
  it("makes distinct, well-formed ids", () => {
    const ids = new Set(Array.from({ length: 100 }, newGameId));
    expect(ids.size).toBe(100);
    for (const id of ids) expect(id).toMatch(GAME_ID);
  });
});
