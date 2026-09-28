import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setArchetypeDesignerForTests } from "@/dm/archetype";
import { CHEF_DRAFT } from "@/engine/chef.fixture";
import { parseCustomArchetype } from "@/engine/customArchetype";
import { newGame, type GameState } from "@/engine/game";
import { POST as designArchetype } from "../archetypes/route";
import { memoryStore, setGameStoreForTests } from "@/server/saves";
import { POST as levelUp } from "./[id]/level-up/route";
import { DELETE as deleteGame, GET as getGame } from "./[id]/route";
import { GET as list, POST as create } from "./route";

const post = (body: unknown) => new Request("http://test/api/games", { method: "POST", body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

afterEach(() => {
  setGameStoreForTests(undefined);
  setArchetypeDesignerForTests(undefined);
});

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

describe("Something else", () => {
  const { concept: _c, pool: _p, skills: _s, abilities, ...rest } = CHEF_DRAFT;
  const draft = { ...rest, magic: false, skills: ["blades", "survival"], signature: abilities[0], abilities: abilities.slice(1) };
  const design = (body: unknown) => designArchetype(new Request("http://test/api/archetypes", { method: "POST", body: JSON.stringify(body) }));

  it("designs an archetype from the player's concept without saving anything", async () => {
    setGameStoreForTests(memoryStore());
    setArchetypeDesignerForTests({ design: async () => draft });
    const res = await design({ concept: "  a royal chef " });
    expect(res.status).toBe(200);
    const { archetype } = (await res.json()) as { archetype: { concept: string; name: string } };
    expect(archetype).toMatchObject({ concept: "a royal chef", name: "Chef" });
    expect((await (await list()).json()).games).toEqual([]);
  });

  it("explains empty concepts and designs that never fit", async () => {
    setArchetypeDesignerForTests({ design: async () => ({ ...draft, stats: {} }) });
    expect((await design({ concept: " " })).status).toBe(400);
    const res = await design({ concept: "a god" });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: string }).error).toMatch(/balanced/);
  });

  it("starts a saved game with the generated archetype, re-checking it", async () => {
    setGameStoreForTests(memoryStore());
    const custom = parseCustomArchetype(CHEF_DRAFT);
    if (!custom.ok) throw new Error("fixture");
    const created = (await (await create(post({ custom: custom.value }))).json()) as { id: string; state: GameState };
    expect(created.state.character).toMatchObject({ archetype: "custom", custom: { name: "Chef" } });
    const listed = (await (await list()).json()) as { games: { archetypeName: string }[] };
    expect(listed.games[0]!.archetypeName).toBe("Chef");

    const greedy = { ...custom.value, stats: { ...custom.value.stats, might: 2 } };
    expect((await create(post({ custom: greedy }))).status).toBe(400);
  });
});

describe("deleting", () => {
  it("deletes a saved game for good", async () => {
    setGameStoreForTests(memoryStore());
    const { id } = (await (await create(post({ archetype: "mage" }))).json()) as { id: string };
    expect((await deleteGame(new Request("http://test"), params(id))).status).toBe(200);
    expect((await deleteGame(new Request("http://test"), params(id))).status).toBe(404);
    expect((await getGame(new Request("http://test"), params(id))).status).toBe(404);
  });
});
