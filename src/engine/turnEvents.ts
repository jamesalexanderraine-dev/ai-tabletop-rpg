// What the browser receives while a turn plays out, in order: rolls the moment the
// engine makes them, narration as it's written, then the finished turn.

import type { GameState, Roll, Turn } from "./game";

export type TurnStreamEvent =
  | { type: "roll"; roll: Roll }
  | { type: "text"; delta: string }
  | { type: "discard" } // the text so far was a preamble, not the narration
  | { type: "done"; state: GameState; turn: Turn }
  | { type: "error"; error: string };
