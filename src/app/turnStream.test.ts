import { describe, expect, it } from "vitest";
import type { TurnStreamEvent } from "@/engine/turnEvents";
import { readTurnEvents } from "./turnStream";

// A response whose body arrives in awkward pieces, like a slow mobile connection.
function chunkedResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
  );
}

describe("readTurnEvents", () => {
  it("parses events split across chunks, in order", async () => {
    const events: TurnStreamEvent[] = [];
    await readTurnEvents(
      chunkedResponse(['{"type":"te', 'xt","delta":"Hel"}\n{"type":"text","delta":"lo"}\n{"type":', '"discard"}\n']),
      (e) => events.push(e),
    );
    expect(events).toEqual([{ type: "text", delta: "Hel" }, { type: "text", delta: "lo" }, { type: "discard" }]);
  });

  it("handles a final event without a trailing newline", async () => {
    const events: TurnStreamEvent[] = [];
    await readTurnEvents(chunkedResponse(['{"type":"error","error":"x"}']), (e) => events.push(e));
    expect(events).toEqual([{ type: "error", error: "x" }]);
  });
});
