import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { parseGameState, validatePlayerInput } from "@/engine/game";
import { createClaudeDm, DmRefusalError } from "@/dm/claude";
import { hasAnthropicKey } from "@/dm/config";
import { playTurn } from "@/dm/turn";

// A turn is a few model calls when the DM rolls dice, so give it room.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
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
  const { state: rawState, input } = (body ?? {}) as { state?: unknown; input?: unknown };
  const state = parseGameState(rawState);
  if (!state) return error(400, "The saved game looks damaged. Start a new game to keep playing.");
  const playerInput = validatePlayerInput(input);
  if (!playerInput.ok) return error(400, playerInput.error);

  try {
    const result = await playTurn(state, playerInput.value, createClaudeDm());
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DmRefusalError) {
      return error(422, "The DM wouldn't run that one. Try putting it another way.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      return error(429, "The DM is catching their breath (rate limited). Try again in a moment.");
    }
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.error("DM auth error", err.status);
      return error(502, "The DM's API key was rejected. Check ANTHROPIC_API_KEY on this deploy.");
    }
    if (err instanceof Anthropic.APIError) {
      console.error("DM API error", err.status, err.message);
      return error(502, "The DM stumbled (API error). Try again.");
    }
    console.error("DM turn failed", err);
    return error(500, "Something went wrong running that turn. Try again.");
  }
}
