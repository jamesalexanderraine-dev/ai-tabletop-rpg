import { NextResponse } from "next/server";
import { applyLevelUp, type LevelUpChoice } from "@/engine/progression";
import { gameStore, GAME_ID } from "@/server/saves";

export const dynamic = "force-dynamic";

// Level-ups are validated and saved on the server, like everything else that
// changes a server-saved game.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = gameStore();
  if (!store) return NextResponse.json({ error: "Server saves aren't set up on this deploy." }, { status: 503 });
  if (!GAME_ID.test(id)) return NextResponse.json({ error: "No such game." }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { choice?: LevelUpChoice } | null;
  if (!body?.choice || typeof body.choice !== "object") {
    return NextResponse.json({ error: "Choose what to take for this level." }, { status: 400 });
  }
  try {
    const state = await store.get(id);
    if (!state) return NextResponse.json({ error: "No such game." }, { status: 404 });
    const outcome = applyLevelUp(state, {
      skills: body.choice.skills && typeof body.choice.skills === "object" ? body.choice.skills : {},
      ability: body.choice.ability ?? null,
      stat: body.choice.stat ?? null,
      trait: body.choice.trait ?? null,
    });
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 400 });
    await store.put(id, outcome.state);
    return NextResponse.json({ id, state: outcome.state });
  } catch (err) {
    console.error("Level-up save failed", err);
    return NextResponse.json({ error: "Couldn't save the level-up. Try again." }, { status: 502 });
  }
}
