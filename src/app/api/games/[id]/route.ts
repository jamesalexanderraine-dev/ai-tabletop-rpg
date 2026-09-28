import { NextResponse } from "next/server";
import { gameStore, GAME_ID } from "@/server/saves";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = gameStore();
  if (!store) return NextResponse.json({ error: "Server saves aren't set up on this deploy." }, { status: 503 });
  if (!GAME_ID.test(id)) return NextResponse.json({ error: "No such game." }, { status: 404 });
  try {
    const state = await store.get(id);
    if (!state) return NextResponse.json({ error: "No such game." }, { status: 404 });
    return NextResponse.json({ id, state });
  } catch (err) {
    console.error("Loading a save failed", err);
    return NextResponse.json({ error: "Couldn't load that game. Try again." }, { status: 502 });
  }
}
