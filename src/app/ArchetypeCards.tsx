"use client";

import { useState, type FormEvent } from "react";
import { MAX_CONCEPT_LENGTH } from "@/engine/customArchetype";
import { STATS } from "@/engine/dice";
import { capitalize } from "@/engine/game";
import { abilityInfo, ARCHETYPES, skillInfo, type BuiltInArchetype, type CustomArchetype } from "@/engine/progression";
import { designArchetype } from "./saves";
import { formatMod } from "./Sheet";

type Pick = (choice: BuiltInArchetype | CustomArchetype) => void;

const trainedIn = (skills: Record<string, number>) =>
  Object.keys(skills)
    .map((id) => skillInfo(id)?.name ?? id)
    .join(" and ");

// The one choice made before play (docs/UPDATES.md, "Archetypes at the start"):
// three words that signal the genre and give the player a foothold, with just
// enough about each to choose, or "Something else" in their own words.
// Everything else is authored in the story.
export function ArchetypeCards({ onPick, busy = false }: { onPick: Pick; busy?: boolean }) {
  return (
    <div className="archetypes">
      {ARCHETYPES.map((a) => {
        const signature = abilityInfo(a.signature)!;
        return (
          <button key={a.id} type="button" className="archetype" onClick={() => onPick(a.id as BuiltInArchetype)} disabled={busy}>
            <span className="archetype-name">{a.name}</span>
            <span className="archetype-tagline">{a.tagline}</span>
            <span className="archetype-detail">
              <strong>{signature.name}</strong> <span className="muted">({signature.cost} {a.pool})</span>: {signature.description}
            </span>
            <span className="archetype-detail muted">Trained in {trainedIn(a.skills)}</span>
          </button>
        );
      })}
      <SomethingElse onPick={onPick} busy={busy} />
    </div>
  );
}

// "Something else": the player describes who they are and the DM builds the kit,
// held to the same budget as the three above. They see it before committing.
function SomethingElse({ onPick, busy }: { onPick: Pick; busy: boolean }) {
  const [concept, setConcept] = useState("");
  const [kit, setKit] = useState<CustomArchetype | null>(null);
  const [designing, setDesigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function design(event?: FormEvent) {
    event?.preventDefault();
    if (!concept.trim() || designing) return;
    setDesigning(true);
    setError(null);
    try {
      setKit(await designArchetype(concept));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't make that character. Try again.");
    } finally {
      setDesigning(false);
    }
  }

  if (kit) {
    const [signature, ...later] = kit.abilities;
    return (
      <div className="archetype custom made">
        <span className="archetype-name">{kit.name}</span>
        <span className="archetype-tagline">{kit.tagline}</span>
        <span className="archetype-detail">
          <strong>{signature!.name}</strong> <span className="muted">({signature!.cost} {kit.pool})</span>: {signature!.description}
        </span>
        <span className="archetype-detail muted">
          Trained in {trainedIn(kit.skills)}. Signature weapon: {kit.signatureWeapon.replace(/^(an?|the) /i, "").toLowerCase()}.
        </span>
        <span className="archetype-detail muted">
          {STATS.filter((s) => kit.stats[s] > 0)
            .map((s) => `${capitalize(s)} ${formatMod(kit.stats[s])}`)
            .join(" · ")}
        </span>
        <details className="archetype-detail">
          <summary>Grows into {later.length} more {kit.pool === "MP" ? "spells" : "abilities"}</summary>
          <ul className="rows">
            {later.map((a) => (
              <li key={a.id}>
                <span>
                  <strong>{a.name}</strong>{" "}
                  <span className="muted small">
                    Lv {a.level} · {a.cost} {kit.pool}
                  </span>
                  <br />
                  <span className="small">{a.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="confirm" onClick={() => onPick(kit)} disabled={busy || designing}>
          Play as this {kit.name.toLowerCase()}
        </button>
        <div className="kit-actions">
          <button type="button" className="link" onClick={() => void design()} disabled={busy || designing}>
            {designing ? "Rethinking…" : "Try again"}
          </button>
          <button type="button" className="link" onClick={() => setKit(null)} disabled={busy || designing}>
            Change the description
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="archetype custom" onSubmit={design}>
      <span className="archetype-name">Something else</span>
      <span className="archetype-tagline">Anyone you like. Describe them, and the DM will build their abilities to match.</span>
      <textarea
        className="concept"
        value={concept}
        onChange={(e) => setConcept(e.target.value)}
        placeholder="A royal chef who poisoned the wrong duke"
        aria-label="Describe who you are"
        rows={2}
        maxLength={MAX_CONCEPT_LENGTH}
        disabled={designing}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="confirm" disabled={!concept.trim() || designing || busy}>
        {designing ? "The DM is sketching you…" : "Create"}
      </button>
      {designing && <span className="muted small">This takes about half a minute.</span>}
    </form>
  );
}
