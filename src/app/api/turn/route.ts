import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { parseGameState, validatePlayerInput } from "@/engine/game";
import { createClaudeDm, DmRefusalError } from "@/dm/claude";
import { dmModel, hasAnthropicKey } from "@/dm/config";
import { playTurn } from "@/dm/turn";

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
    if (err instanceof Anthropic.APIError) {
      // Anthropic's own reason, which never includes the key, so problems can be
      // diagnosed from the phone without digging through Vercel logs.
      const reason = apiReason(err);
      console.error("DM API error", err.status, reason);
      if (err instanceof Anthropic.AuthenticationError) {
        return error(502, `Anthropic didn't accept the API key (401: ${reason}).`);
      }
      if (err instanceof Anthropic.PermissionDeniedError) {
        return error(502, `The API key isn't allowed to use ${dmModel()} (403: ${reason}).`);
      }
      return error(502, `The DM stumbled (${err.status ?? "network"} error: ${reason}). Try again.`);
    }
    console.error("DM turn failed", err);
    return error(500, "Something went wrong running that turn. Try again.");
  }
}
