// Streams one turn to the browser as newline-delimited JSON events, so the
// player sees the dice start rolling while the DM is still writing.

import type { TurnStreamEvent } from "@/engine/turnEvents";
import type { TurnEvents, TurnResult } from "./turn";

export function turnEventStream(
  run: (events: TurnEvents) => Promise<TurnResult>,
  describeError: (err: unknown) => string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      let open = true;
      const send = (event: TurnStreamEvent) => {
        // If the player closed the page mid-turn, there's no one left to tell.
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          open = false;
        }
      };
      try {
        const result = await run({
          onRoll: (roll) => send({ type: "roll", roll }),
          onText: (delta) => send({ type: "text", delta }),
          onDiscardText: () => send({ type: "discard" }),
        });
        send({ type: "done", state: result.state, turn: result.turn });
      } catch (err) {
        send({ type: "error", error: describeError(err) });
      }
      try {
        controller.close();
      } catch {
        // Already cancelled by the browser.
      }
    },
  });
}
