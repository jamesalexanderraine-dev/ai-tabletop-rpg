// The one interface every Dungeon Master model sits behind, so Claude can be
// swapped for another model without touching the engine or the UI.

export interface DmHistoryTurn {
  player: string | null;
  narration: string;
}

export interface DmTurnInput {
  // Compact, code-owned state summary for this turn (character, memories, recent rolls).
  stateSummary: string;
  // A short window of recent turns, oldest first. Not the full transcript.
  history: DmHistoryTurn[];
  playerInput: string;
}

export interface DmToolResult {
  content: string;
  isError: boolean;
}

// The engine side of tool calls. The DM passes the model's raw input through
// and relays the result (or the engine's rejection) back to the model.
export type DmToolHandler = (name: string, input: unknown) => DmToolResult;

// Optional live updates while a turn is being written, for streaming to the player.
export interface DmHooks {
  onText?: (delta: string) => void;
  // Text streamed so far was a preamble before a tool call, not the narration.
  onDiscardText?: () => void;
}

export interface DungeonMaster {
  narrate(input: DmTurnInput, runTool: DmToolHandler, hooks?: DmHooks): Promise<string>;
}
