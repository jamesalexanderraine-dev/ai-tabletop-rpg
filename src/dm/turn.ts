// One turn of the core loop: the player states intent, the DM narrates and
// proposes changes through tools, and the engine validates and applies them.

import type { PreparedAction } from "@/engine/actions";
import type { Rng } from "@/engine/dice";
import { appendTurn, type Change, type GameState, type Roll, type Turn } from "@/engine/game";
import { abilityFor } from "@/engine/progression";
import { applyDmTool } from "@/engine/tools";
import { buildStateSummary, HISTORY_WINDOW } from "./prompt";
import type { DmHooks, DmToolResult, DungeonMaster } from "./types";

export interface TurnResult {
  state: GameState;
  turn: Turn;
}

// Live updates as the turn unfolds: each roll the moment the engine makes it,
// then the narration as it's written.
export interface TurnEvents extends DmHooks {
  onRoll?: (roll: Roll) => void;
}

export async function playTurn(
  state: GameState,
  playerInput: string,
  dm: DungeonMaster,
  rng: Rng = Math.random,
  events: TurnEvents = {},
  // Chips from the composer, already checked and applied by the engine.
  action?: PreparedAction,
): Promise<TurnResult> {
  let working = action?.state ?? state;
  const rolls: Roll[] = [];
  const changes: Change[] = action?.change ? [action.change] : [];

  const runTool = (name: string, input: unknown): DmToolResult => {
    const applied = applyDmTool(working, name, input, { rollsSoFar: rolls.length, rng });
    if (!applied.ok) return { content: applied.error, isError: true };
    working = applied.state;
    if (applied.roll) {
      rolls.push(applied.roll);
      events.onRoll?.(applied.roll);
    }
    if (applied.change) changes.push(applied.change);
    return { content: applied.message, isError: false };
  };

  const narration = await dm.narrate(
    {
      stateSummary: buildStateSummary(working),
      history: state.turns.slice(-HISTORY_WINDOW).map((t) => ({ player: withChips(state, t), narration: t.narration })),
      playerInput: action?.note ? `${action.note}\n\n${playerInput}` : playerInput,
    },
    runTool,
    { onText: events.onText, onDiscardText: events.onDiscardText },
  );

  const turn: Turn = {
    player: playerInput,
    narration: narration.trim(),
    rolls,
    changes,
    ...(action?.ability && { ability: action.ability }),
    ...(action?.items && { items: action.items }),
  };
  return { state: appendTurn(working, turn), turn };
}

// A past turn as the DM sees it in the history, chips included.
function withChips(state: GameState, turn: Turn): string | null {
  if (turn.player === null) return null;
  const chips = [
    ...(turn.ability ? [`using ${abilityFor(state.character, turn.ability)?.name ?? turn.ability}`] : []),
    ...(turn.items?.length ? [`with ${turn.items.join(", ")}`] : []),
  ];
  return chips.length ? `[${chips.join("; ")}] ${turn.player}` : turn.player;
}
