import { describe, expect, it } from "vitest";
import { newGame } from "@/engine/game";
import type { TurnStreamEvent } from "@/engine/turnEvents";
import { turnEventStream } from "./stream";

async function readAll(stream: ReadableStream<Uint8Array>): Promise<TurnStreamEvent[]> {
  const text = await new Response(stream).text();
  return text
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as TurnStreamEvent);
}

describe("turnEventStream", () => {
  it("sends rolls and text as they happen, then the finished turn", async () => {
    const state = newGame();
    const turn = { player: "x", narration: "Done.", rolls: [], changes: [] };
    const events = await readAll(
      turnEventStream(async (on) => {
        on.onRoll?.({ roll: 20 } as never);
        on.onText?.("Do");
        on.onDiscardText?.();
        on.onText?.("ne.");
        return { state, turn };
      }, String),
    );
    expect(events.map((e) => e.type)).toEqual(["roll", "text", "discard", "text", "done"]);
    expect(events.at(-1)).toEqual({ type: "done", state, turn });
  });

  it("turns a failure into an error event instead of a broken stream", async () => {
    const events = await readAll(
      turnEventStream(async () => {
        throw new Error("boom");
      }, () => "The DM stumbled."),
    );
    expect(events).toEqual([{ type: "error", error: "The DM stumbled." }]);
  });
});
