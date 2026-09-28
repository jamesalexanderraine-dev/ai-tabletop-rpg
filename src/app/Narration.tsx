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

// A spoken line, as a pull quote: face, name and who they are to you on a line
// above, coloured by attitude so friend and foe read at a glance.
export function Speech({ who, role, tone, children }: { who: string; role?: string; tone: string; children: ReactNode }) {
  return (
    <div className={`say ${tone}`}>
      <div className="speaker">
        <span className="avatar" aria-hidden>
          {initial(who)}
        </span>
        <span className="speaker-name">{who}</span>
        {role && <span className="speaker-role">{role}</span>}
      </div>
      <p className="quote">{children}</p>
    </div>
  );
}

// The DM's narration: prose paragraphs, with spoken lines lifted out as quotes.
export function Narration({ text, game, opening = false }: { text: string; game: GameState; opening?: boolean }) {
  return (
    <div className={opening ? "narration opening" : "narration"}>
      {parseNarration(text).map((part, i) => {
        if (part.kind === "prose") return <p key={i}>{part.text}</p>;
        if (isPlayer(game, part.who)) {
          return (
            <Speech key={i} who={game.character.name ?? "You"} tone="you">
              {part.text}
            </Speech>
          );
        }
        const npc = speakerOf(game, part.who, part.npc);
        return (
          <Speech key={i} who={part.who} role={npc?.role ?? part.role} tone={npc?.attitude ?? "neutral"}>
            {part.text}
          </Speech>
        );
      })}
    </div>
  );
}
