"use client";

import type { ReactNode } from "react";
import type { GameState } from "@/engine/game";
import { parseNarration } from "@/engine/narration";

// Who's talking, for the bubble's colour: the NPC's attitude if we know them
// (so friend and foe read at a glance), otherwise neutral.
function toneOf(game: GameState, who: string): string {
  const name = who.toLowerCase().replace(/^the\s+/, "");
  const npc = game.npcs.find((n) => {
    const known = n.name.toLowerCase();
    return known === name || known.split(/\s+/)[0] === name.split(/\s+/)[0];
  });
  return npc?.attitude ?? "neutral";
}

// Until portraits arrive (the preset image library), a face is an initial.
function initial(who: string): string {
  return (who.replace(/^the\s+/i, "").trim()[0] ?? "?").toUpperCase();
}

export function Bubble({ who, tone, you = false, children }: { who: string; tone: string; you?: boolean; children: ReactNode }) {
  return (
    <div className={you ? "say you" : `say ${tone}`}>
      {!you && (
        <span className="avatar" aria-hidden>
          {initial(who)}
        </span>
      )}
      <div className="bubble">
        <span className="speaker">{who}</span>
        <span className="words">{children}</span>
      </div>
      {you && (
        <span className="avatar" aria-hidden>
          {initial(who)}
        </span>
      )}
    </div>
  );
}

// The DM's narration: prose paragraphs, with spoken lines lifted into bubbles.
export function Narration({ text, game, opening = false }: { text: string; game: GameState; opening?: boolean }) {
  return (
    <div className={opening ? "narration opening" : "narration"}>
      {parseNarration(text).map((part, i) =>
        part.kind === "prose" ? (
          <p key={i}>{part.text}</p>
        ) : (
          <Bubble key={i} who={part.who} tone={toneOf(game, part.who)}>
            {part.text}
          </Bubble>
        ),
      )}
    </div>
  );
}
