// Reads the turn route's newline-delimited JSON events as they arrive.

import type { TurnStreamEvent } from "@/engine/turnEvents";

export async function readTurnEvents(response: Response, onEvent: (event: TurnStreamEvent) => void): Promise<void> {
  if (!response.body) throw new Error("The DM's reply didn't arrive.");
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += value;
    // Events can be split across chunks; only parse complete lines.
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onEvent(JSON.parse(line) as TurnStreamEvent);
    }
    if (done) break;
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as TurnStreamEvent);
}
