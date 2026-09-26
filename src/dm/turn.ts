// One turn of the core loop: the player states intent, the DM narrates and
// proposes changes through tools, and the engine validates and applies them.

import type { Rng } from "@/engine/dice";
import { appendTurn, describeRoll, remember, requestCheck, type GameState, type Roll, type Turn } from "@/engine/game";
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

  const runTool = (name: string, input: unknown): DmToolResult => {
    if (name === "roll_check") {
      const outcome = requestCheck(working, input, rolls.length, rng);
      if (!outcome.ok) return { content: outcome.error, isError: true };
      rolls.push(outcome.value);
      return { content: describeRoll(outcome.value), isError: false };
    }
    if (name === "remember") {
      const outcome = remember(working, input);
      if (!outcome.ok) return { content: outcome.error, isError: true };
      working = outcome.value;
      return { content: "Saved.", isError: false };
    }
    return { content: `There is no tool called "${name}".`, isError: true };
  };

  const narration = await dm.narrate(
    {
      stateSummary: buildStateSummary(state),
      history: state.turns.slice(-HISTORY_WINDOW).map(({ player, narration }) => ({ player, narration })),
      playerInput,
    },
    runTool,
  );

  const turn: Turn = { player: playerInput, narration: narration.trim(), rolls };
  return { state: appendTurn(working, turn), turn };
}
