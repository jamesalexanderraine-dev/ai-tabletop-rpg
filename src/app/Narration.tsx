"use client";

import type { ReactNode } from "react";
import type { GameState, Npc } from "@/engine/game";
import { parseNarration } from "@/engine/narration";

// The character in the state behind a spoken line: the one the DM linked with
// npc="…", or else the one whose name matches.
function speakerOf(game: GameState, who: string, npc?: string): Npc | undefined {
  const byName = (name: string) => {
    const wanted = name.toLowerCase().replace(/^the\s+/, "");
    return game.npcs.find((n) => {
      const known = n.name.toLowerCase();
      return known === wanted || known.split(/\s+/)[0] === wanted.split(/\s+/)[0];
    });
  };
  return (npc && byName(npc)) || byName(who);
}

// Until portraits arrive (the preset image library), a face is an initial.
function initial(who: string): string {
  return (who.replace(/^the\s+/i, "").trim()[0] ?? "?").toUpperCase();
}

// Lines the DM gives the player's own character: who="You" or their name.
function isPlayer(game: GameState, who: string): boolean {
  const name = who.trim().toLowerCase();
  return name === "you" || name === game.character.name?.toLowerCase();
}

// A spoken line: face, name and who they are to you on a line above, and the
// bubble starting beside the face and running to the far margin. Coloured by
// attitude, so friend and foe read at a glance. The player's character speaks
// from the right.
export function Bubble({
  who,
  role,
  tone,
  you = false,
  children,
}: {
  who: string;
  role?: string;
  tone: string;
  you?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={you ? "say you" : `say ${tone}`}>
      <div className="speaker">
        <span className="avatar" aria-hidden>
          {initial(who)}
        </span>
        <span className="speaker-name">{who}</span>
        {role && <span className="speaker-role">{role}</span>}
      </div>
      <div className="bubble">{children}</div>
    </div>
  );
}

// The DM's narration: prose paragraphs, with spoken lines lifted into bubbles.
export function Narration({ text, game, opening = false }: { text: string; game: GameState; opening?: boolean }) {
  return (
    <div className={opening ? "narration opening" : "narration"}>
      {parseNarration(text).map((part, i) => {
        if (part.kind === "prose") return <p key={i}>{part.text}</p>;
        if (isPlayer(game, part.who)) {
          return (
            <Bubble key={i} who={game.character.name ?? "You"} tone="you" you>
              {part.text}
            </Bubble>
          );
        }
        const npc = speakerOf(game, part.who, part.npc);
        return (
          <Bubble key={i} who={part.who} role={npc?.role} tone={npc?.attitude ?? "neutral"}>
            {part.text}
          </Bubble>
        );
      })}
    </div>
  );
}
