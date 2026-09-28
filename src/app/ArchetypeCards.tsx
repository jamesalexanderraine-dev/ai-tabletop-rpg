"use client";

import { abilityInfo, ARCHETYPES, skillInfo, type Archetype } from "@/engine/progression";

// The one choice made before play (docs/UPDATES.md, "Archetypes at the start"):
// three words that signal the genre and give the player a foothold, with just
// enough about each to choose. Everything else is authored in the story.
export function ArchetypeCards({ onPick, busy = false }: { onPick: (archetype: Archetype) => void; busy?: boolean }) {
  return (
    <div className="archetypes">
      {ARCHETYPES.map((a) => {
        const signature = abilityInfo(a.signature)!;
        return (
          <button key={a.id} type="button" className="archetype" onClick={() => onPick(a.id)} disabled={busy}>
            <span className="archetype-name">{a.name}</span>
            <span className="archetype-tagline">{a.tagline}</span>
            <span className="archetype-detail">
              <strong>{signature.name}</strong>{" "}
              <span className="muted">
                ({signature.cost} {a.pool === "MP" ? "MP" : "stamina"})
              </span>
              : {signature.description}
            </span>
            <span className="archetype-detail muted">
              Trained in{" "}
              {Object.keys(a.skills)
                .map((id) => skillInfo(id)?.name ?? id)
                .join(" and ")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
