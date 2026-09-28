import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { ArchetypeError, archetypeDesigner, generateArchetype, validateConcept } from "@/dm/archetype";
import { DmRefusalError } from "@/dm/claude";
import { MAX_CONCEPT_LENGTH } from "@/engine/customArchetype";

// Designing an archetype is one model call, sometimes two.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// "Something else": design an archetype from the player's concept. Nothing is
// saved yet; the player sees the result and starts a game with it (or doesn't).
export async function POST(request: Request) {
  const designer = archetypeDesigner();
  if (!designer) {
    return NextResponse.json({ error: "The DM isn't connected: ANTHROPIC_API_KEY isn't set on this deploy." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { concept?: unknown } | null;
  const concept = validateConcept(body?.concept);
  if (!concept) {
    return NextResponse.json({ error: `Describe who you are in under ${MAX_CONCEPT_LENGTH} characters.` }, { status: 400 });
  }
  try {
    const archetype = await generateArchetype(concept, designer);
    return NextResponse.json({ archetype });
  } catch (err) {
    return NextResponse.json({ error: describeError(err) }, { status: err instanceof ArchetypeError ? 422 : 502 });
  }
}

function describeError(err: unknown): string {
  if (err instanceof ArchetypeError) return err.message;
  if (err instanceof DmRefusalError) return "The DM wouldn't make that one. Try describing it another way.";
  if (err instanceof Anthropic.RateLimitError) return "The DM is catching their breath (rate limited). Try again in a moment.";
  if (err instanceof Anthropic.APIError) {
    console.error("Archetype API error", err.status, err.message);
    if (err instanceof Anthropic.AuthenticationError) return "Anthropic didn't accept the API key (401).";
    return `The DM stumbled (${err.status ?? "network"} error). Try again.`;
  }
  console.error("Archetype generation failed", err);
  return "Something went wrong making your character. Try again.";
}
