import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { prepareAction } from "@/engine/actions";
import { parseGameState, validatePlayerInput, type GameState } from "@/engine/game";
import { createClaudeDm, DmRefusalError } from "@/dm/claude";
import { dmModel, hasAnthropicKey } from "@/dm/config";
import { turnEventStream } from "@/dm/stream";
import { playTurn } from "@/dm/turn";
import { GAME_ID, gameStore } from "@/server/saves";

// A turn is a few model calls when the DM rolls dice, so give it room.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function apiReason(err: InstanceType<typeof Anthropic.APIError>): string {
  const body = err.error as { error?: { message?: unknown } } | undefined;
  const message = body?.error?.message;
  return typeof message === "string" && message ? message : err.message;
}

export async function POST(request: Request) {
  if (!hasAnthropicKey()) {
    return error(503, "The DM isn't connected: ANTHROPIC_API_KEY isn't set on this deploy.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "Couldn't read that request.");
  }
  const { gameId, state: rawState, input, ability, items } = (body ?? {}) as {
    gameId?: unknown;
    state?: unknown;
    input?: unknown;
    ability?: unknown;
    items?: unknown;
  };
  const playerInput = validatePlayerInput(input);
  if (!playerInput.ok) return error(400, playerInput.error);

  // A server-saved game is loaded here and saved after the turn, so the server
  // holds the truth. Without a database, the browser sends its saved state.
  const store = gameStore();
  let state: GameState | null;
  if (typeof gameId === "string") {
    if (!store) return error(503, "Server saves aren't set up on this deploy.");
    if (!GAME_ID.test(gameId)) return error(404, "No such game.");
    try {
      state = await store.get(gameId);
    } catch (err) {
      console.error("Loading a save failed", err);
      return error(502, "Couldn't load your game. Try again.");
    }
    if (!state) return error(404, "That game couldn't be found.");
  } else {
    state = parseGameState(rawState);
    if (!state) return error(400, "The saved game looks damaged. Start a new game to keep playing.");
  }
  const current = state;
  // Chips from the composer: checked (and an ability paid for) before the DM starts.
  const action = prepareAction(current, {
    ability: ability === undefined || ability === null ? undefined : (ability as string),
    items: items === undefined || items === null ? undefined : (items as string[]),
  });
  if (!action.ok) return error(400, action.error);

  // Validation errors above are plain JSON; from here on the turn streams.
  const stream = turnEventStream(async (events) => {
    const result = await playTurn(current, playerInput.value, createClaudeDm(), Math.random, events, action.value);
    if (typeof gameId === "string" && store) await store.put(gameId, result.state);
    return result;
  }, describeError);
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function describeError(err: unknown): string {
  if (err instanceof DmRefusalError) return "The DM wouldn't run that one. Try putting it another way.";
  if (err instanceof Anthropic.RateLimitError) {
    return "The DM is catching their breath (rate limited). Try again in a moment.";
  }
  if (err instanceof Anthropic.APIError) {
    // Anthropic's own reason, which never includes the key, so problems can be
    // diagnosed from the phone without digging through Vercel logs.
    const reason = apiReason(err);
    console.error("DM API error", err.status, reason);
    if (err instanceof Anthropic.AuthenticationError) return `Anthropic didn't accept the API key (401: ${reason}).`;
    if (err instanceof Anthropic.PermissionDeniedError) {
      return `The API key isn't allowed to use ${dmModel()} (403: ${reason}).`;
    }
    return `The DM stumbled (${err.status ?? "network"} error: ${reason}). Try again.`;
  }
  console.error("DM turn failed", err);
  return "Something went wrong running that turn. Try again.";
}
