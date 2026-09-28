import { NextResponse } from "next/server";
import { newGame, parseGameState } from "@/engine/game";
import { parseCustomArchetype } from "@/engine/customArchetype";
import { ARCHETYPE_IDS, type BuiltInArchetype } from "@/engine/progression";
import { gameStore, newGameId } from "@/server/saves";

export const dynamic = "force-dynamic";

// The saved games to continue, newest first. `storage: "browser"` means no
// database is connected, so the client keeps saving in the browser.
export async function GET() {
  const store = gameStore();
  if (!store) return NextResponse.json({ storage: "browser", games: [] });
  try {
    return NextResponse.json({ storage: "server", games: await store.list() });
  } catch (err) {
    console.error("Listing saves failed", err);
    return NextResponse.json({ error: "Couldn't reach your saved games. Try again." }, { status: 502 });
  }
}

// Start a new game ({ archetype } for the three defaults, { custom } for a
// generated one) or upload one saved in a browser ({ import }).
export async function POST(request: Request) {
  const store = gameStore();
  if (!store) return NextResponse.json({ error: "Server saves aren't set up on this deploy." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { archetype?: unknown; custom?: unknown; import?: unknown } | null;

  let state;
  if (body && body.import !== undefined) {
    state = parseGameState(body.import);
    if (!state) return NextResponse.json({ error: "That saved game looks damaged." }, { status: 400 });
  } else if (body && (ARCHETYPE_IDS as readonly unknown[]).includes(body.archetype)) {
    state = newGame(body.archetype as BuiltInArchetype);
  } else if (body && body.custom !== undefined) {
    // Checked against the same budget as when it was generated.
    const custom = parseCustomArchetype(body.custom);
    if (!custom.ok) return NextResponse.json({ error: "That character doesn't fit the rules. Try generating it again." }, { status: 400 });
    state = newGame(custom.value);
  } else {
    return NextResponse.json({ error: "Pick Warrior, Rogue or Mage." }, { status: 400 });
  }

  const id = newGameId();
  try {
    await store.put(id, state);
  } catch (err) {
    console.error("Saving a new game failed", err);
    return NextResponse.json({ error: "Couldn't save the new game. Try again." }, { status: 502 });
  }
  return NextResponse.json({ id, state });
}
