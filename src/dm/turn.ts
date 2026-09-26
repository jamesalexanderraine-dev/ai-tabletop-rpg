// One turn of the core loop: the player states intent, the DM narrates and
// proposes changes through tools, and the engine validates and applies them.

import type { Rng } from "@/engine/dice";
import { appendTurn, type Change, type GameState, type Roll, type Turn } from "@/engine/game";
import { applyDmTool } from "@/engine/tools";
import { buildStateSummary, HISTORY_WINDOW } from "./prompt";
import type { DmToolResult, DungeonMaster } from "./types";

export interface TurnResult {
  state: GameState;
  turn: Turn;
}

export async function playTurn(
  state: GameState,
  playerInput: string,
  dm: DungeonMaster,
  rng: Rng = Math.random,
): Promise<TurnResult> {
  let working = state;
  const rolls: Roll[] = [];
  const changes: Change[] = [];

  const runTool = (name: string, input: unknown): DmToolResult => {
    const applied = applyDmTool(working, name, input, { rollsSoFar: rolls.length, rng });
    if (!applied.ok) return { content: applied.error, isError: true };
    working = applied.state;
    if (applied.roll) rolls.push(applied.roll);
    if (applied.change) changes.push(applied.change);
    return { content: applied.message, isError: false };
  };

  const narration = await dm.narrate(
    {
      stateSummary: buildStateSummary(state),
      history: state.turns.slice(-HISTORY_WINDOW).map(({ player, narration }) => ({ player, narration })),
      playerInput,
    },
    runTool,
  );

  const turn: Turn = { player: playerInput, narration: narration.trim(), rolls, changes };
  return { state: appendTurn(working, turn), turn };
}
