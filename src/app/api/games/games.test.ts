import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newGame, type GameState } from "@/engine/game";
import { memoryStore, setGameStoreForTests } from "@/server/saves";
import { POST as levelUp } from "./[id]/level-up/route";
import { GET as getGame } from "./[id]/route";
import { GET as list, POST as create } from "./route";

const post = (body: unknown) => new Request("http://test/api/games", { method: "POST", body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

afterEach(() => setGameStoreForTests(undefined));

describe("without a database", () => {
  beforeEach(() => setGameStoreForTests(null));

  it("tells the browser to keep saving locally", async () => {
    expect(await (await list()).json()).toEqual({ storage: "browser", games: [] });
    expect((await create(post({ archetype: "mage" }))).status).toBe(503);
  });
});

describe("with a database", () => {
  beforeEach(() => setGameStoreForTests(memoryStore()));

  it("creates a game for an archetype, lists it and loads it", async () => {
    const created = (await (await create(post({ archetype: "rogue" }))).json()) as { id: string; state: GameState };
    expect(created.state.character.archetype).toBe("rogue");

    const listed = (await (await list()).json()) as { storage: string; games: { id: string }[] };
    expect(listed.storage).toBe("server");
    expect(listed.games.map((g) => g.id)).toEqual([created.id]);

    const loaded = (await (await getGame(new Request("http://test"), params(created.id))).json()) as { state: GameState };
    expect(loaded.state).toEqual(created.state);
  });

  it("uploads a game saved in a browser, and refuses a damaged one", async () => {
    const sirJohn = newGame("warrior");
    sirJohn.character.name = "Sir John";
    const imported = (await (await create(post({ import: sirJohn }))).json()) as { id: string; state: GameState };
    expect(imported.state.character.name).toBe("Sir John");
    expect((await create(post({ import: { version: 4, nonsense: true } }))).status).toBe(400);
    expect((await create(post({ archetype: "bard" }))).status).toBe(400);
  });

  it("levels up on the server and saves it, rejecting illegal choices", async () => {
    const start = newGame("warrior");
    start.character.xp = 55;
    const { id } = (await (await create(post({ import: start }))).json()) as { id: string };
    const req = (choice: unknown) => new Request("http://test", { method: "POST", body: JSON.stringify({ choice }) });

    const bad = await levelUp(req({ skills: { athletics: 2 }, ability: "spark", stat: "might", trait: null }), params(id));
    expect(bad.status).toBe(400);

    const good = await levelUp(req({ skills: { athletics: 2 }, ability: "camp_cook", stat: "might", trait: null }), params(id));
    expect(good.status).toBe(200);
    const reloaded = (await (await getGame(new Request("http://test"), params(id))).json()) as { state: GameState };
    expect(reloaded.state.character).toMatchObject({ level: 2, abilities: ["feat_of_strength", "camp_cook"] });
  });

  it("404s unknown or malformed ids", async () => {
    expect((await getGame(new Request("http://test"), params("abcdefabcdef"))).status).toBe(404);
    expect((await getGame(new Request("http://test"), params("../secrets"))).status).toBe(404);
  });
});
