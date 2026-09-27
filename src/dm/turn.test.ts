import { describe, expect, it } from "vitest";
import type { Rng } from "@/engine/dice";
import { appendTurn, newGame } from "@/engine/game";
import { HISTORY_WINDOW } from "./prompt";
import { playTurn } from "./turn";
import type { DmToolResult, DmTurnInput, DungeonMaster } from "./types";

const face = (n: number): Rng => () => (n - 1) / 20;

// A scripted DM: makes the given tool calls, records what came back, then narrates.
function stubDm(calls: Array<[string, unknown]>, narration = "The lock clicks open.") {
  const seen: { input?: DmTurnInput; results: DmToolResult[] } = { results: [] };
  const dm: DungeonMaster = {
    async narrate(input, runTool) {
      seen.input = input;
      for (const [name, args] of calls) seen.results.push(runTool(name, args));
      return narration;
    },
  };
  return { dm, seen };
}

describe("playTurn", () => {
  it("records the player's move, engine rolls and the narration", async () => {
    const { dm, seen } = stubDm([["roll_check", { stat: "agility", difficulty: "medium", reason: "pick the lock" }]]);
    const { state, turn } = await playTurn(newGame(), "I pick the lock with a fishbone", dm, face(15));

    expect(seen.results).toEqual([{ content: expect.stringContaining("success"), isError: false }]);
    expect(turn.player).toBe("I pick the lock with a fishbone");
    expect(turn.narration).toBe("The lock clicks open.");
    expect(turn.rolls).toHaveLength(1);
    expect(turn.rolls[0]).toMatchObject({ roll: 15, stat: "agility", success: true });
    expect(state.turns.at(-1)).toEqual(turn);
  });

  it("passes engine rejections back to the DM instead of applying them", async () => {
    const { dm, seen } = stubDm([
      ["roll_check", { stat: "charisma", difficulty: "easy", reason: "smile" }],
      ["teleport", { to: "the moon" }],
    ]);
    const { turn } = await playTurn(newGame(), "I smile at the guard", dm, face(10));
    expect(seen.results.map((r) => r.isError)).toEqual([true, true]);
    expect(turn.rolls).toEqual([]);
  });

  it("stops a dice storm after the per-turn cap", async () => {
    const roll = ["roll_check", { stat: "luck", difficulty: "easy", reason: "again" }] as [string, unknown];
    const { dm, seen } = stubDm([roll, roll, roll, roll]);
    const { turn } = await playTurn(newGame(), "I keep rolling", dm, face(10));
    expect(turn.rolls).toHaveLength(3);
    expect(seen.results.at(-1)?.isError).toBe(true);
  });

  it("saves memories so the next turn's summary carries them", async () => {
    const { dm } = stubDm([
      ["remember", { about: "name", text: "Bramble" }],
      ["remember", { about: "backstory", text: "Wears a loaf of bread as a hat." }],
    ]);
    const first = await playTurn(newGame(), "I'm Bramble, and yes, that's bread on my head", dm);
    expect(first.state.character).toMatchObject({ name: "Bramble", backstory: ["Wears a loaf of bread as a hat."] });

    const next = stubDm([]);
    await playTurn(first.state, "I tip my bread hat to the guard", next.dm);
    expect(next.seen.input?.stateSummary).toContain("Character: Bramble.");
    expect(next.seen.input?.stateSummary).toContain("Wears a loaf of bread as a hat.");
  });

  it("sends the DM a short window of history, not the full transcript", async () => {
    let game = newGame();
    for (let i = 0; i < HISTORY_WINDOW + 5; i++) {
      game = appendTurn(game, { player: `move ${i}`, narration: `result ${i}`, rolls: [], changes: [] });
    }
    const { dm, seen } = stubDm([]);
    await playTurn(game, "I look around", dm);
    expect(seen.input?.history).toHaveLength(HISTORY_WINDOW);
    expect(seen.input?.history.at(-1)).toEqual({ player: `move ${HISTORY_WINDOW + 4}`, narration: `result ${HISTORY_WINDOW + 4}` });
    expect(seen.input?.playerInput).toBe("I look around");
  });

  it("keeps the bread hat across turns and shows the player what changed", async () => {
    const { dm } = stubDm([
      ["add_item", { name: "Bread hat", tags: ["edible", "ridiculous", "worn"] }],
      ["update_npc", { name: "Old Tamsin", attitude: "neutral" }],
    ]);
    const first = await playTurn(newGame(), "I wear the bread as a hat", dm);
    expect(first.turn.changes).toEqual([
      { kind: "item", text: "Gained Bread hat (edible, ridiculous, worn)" },
      { kind: "npc", text: "Old Tamsin \u00b7 unfriendly \u2192 neutral" },
    ]);

    // Many turns later, long past the history window, the hat is still in the state.
    let state = first.state;
    for (let i = 0; i < HISTORY_WINDOW + 3; i++) state = (await playTurn(state, `wander ${i}`, stubDm([]).dm)).state;
    const later = stubDm([["remove_item", { name: "Bread hat" }]]);
    const eaten = await playTurn(state, "I eat my hat", later.dm);
    expect(later.seen.input?.stateSummary).toContain("Bread hat (edible, ridiculous, worn)");
    expect(later.seen.input?.history.some((t) => t.player?.includes("bread"))).toBe(false);
    expect(eaten.state.inventory).toEqual([]);
  });

  it("asks for a story summary every 10 turns, and stops asking once it's written", async () => {
    let state = newGame();
    for (let i = 0; i < 9; i++) state = (await playTurn(state, `step ${i}`, stubDm([]).dm)).state;
    const due = stubDm([["update_story", { summary: "Bramble has been pacing the cell." }]]);
    state = (await playTurn(state, "I pace", due.dm)).state;
    expect(due.seen.input?.stateSummary).toContain("summary is due");

    const after = stubDm([]);
    await playTurn(state, "I pace again", after.dm);
    expect(after.seen.input?.stateSummary).toContain("Story so far (as of turn 10): Bramble has been pacing the cell.");
    expect(after.seen.input?.stateSummary).not.toContain("summary is due");
  });
});
