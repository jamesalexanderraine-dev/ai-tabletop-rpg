"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { MAX_ITEM_CHIPS, MAX_PLAYER_INPUT_LENGTH, type GameState } from "@/engine/game";
import { abilityFor, poolOf } from "@/engine/progression";

export interface Chips {
  ability: string | null;
  items: string[];
}

export const NO_CHIPS: Chips = { ability: null, items: [] };

// The action bar (docs/UPDATES.md, "UI — the composer input"): a chat composer
// with an abilities (or spells) selector and a pack selector inside it. Each
// ability shows its cost and whether it can be afforded right now. Picking one
// drops a chip into the input: "use this for what I'm about to do". Chips are a
// shortcut, never a gate; typing "I heave the cart" works just as well.
export function Composer({
  game,
  draft,
  onDraft,
  chips,
  onChips,
  onSend,
  sending,
  inputRef,
}: {
  game: GameState;
  draft: string;
  onDraft: (text: string) => void;
  chips: Chips;
  onChips: (chips: Chips) => void;
  onSend: () => void;
  sending: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [tray, setTray] = useState<"abilities" | "pack" | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const c = game.character;
  const pool = poolOf(c);
  const noun = pool === "MP" ? "Spells" : "Abilities";

  // Close the tray on a tap anywhere else, or Escape.
  useEffect(() => {
    if (!tray) return;
    const onDown = (e: PointerEvent) => {
      if (!formRef.current?.contains(e.target as Node)) setTray(null);
    };
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setTray(null);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [tray]);

  function resize() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }
  useEffect(resize, [draft, inputRef]);

  // Back to typing after a pick; on phones this brings the keyboard back up.
  function pick(next: Chips) {
    onChips(next);
    setTray(null);
    inputRef.current?.focus();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setTray(null);
    onSend();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      setTray(null);
      onSend();
    }
  }

  const chipAbility = chips.ability ? abilityFor(c, chips.ability) : undefined;
  const known = c.abilities.flatMap((id) => abilityFor(c, id) ?? []);

  return (
    <form className="compose" onSubmit={submit} ref={formRef}>
      {tray === "abilities" && (
        <div className="tray" aria-label={noun}>
          <p className="tray-head">
            {noun} <span className="muted">· {pool === "MP" ? "MP" : "Stamina"} {c.energy}/{c.maxEnergy}</span>
          </p>
          <ul>
            {known.map((a) => {
              const affordable = c.energy >= a.cost;
              const on = chips.ability === a.id;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className={on ? "tray-item on" : "tray-item"}
                    disabled={!affordable}
                    aria-pressed={on}
                    onClick={() => pick({ ...chips, ability: on ? null : a.id })}
                  >
                    <span className="tray-name">
                      <span>{a.name}</span>
                      <span className={affordable ? "cost" : "cost short"}>
                        {affordable ? `${a.cost} ${pool}` : `needs ${a.cost} ${pool}, you have ${c.energy}`}
                      </span>
                    </span>
                    <span className="tray-desc">{a.description}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="muted small tray-foot">Or just describe it: the DM spots your {noun.toLowerCase()} either way, at the same cost.</p>
        </div>
      )}
      {tray === "pack" && (
        <div className="tray" aria-label="Pack">
          <p className="tray-head">Pack</p>
          {game.inventory.length ? (
            <ul>
              {game.inventory.map((item) => {
                const on = chips.items.includes(item.name);
                return (
                  <li key={item.name}>
                    <button
                      type="button"
                      className={on ? "tray-item on" : "tray-item"}
                      disabled={!on && chips.items.length >= MAX_ITEM_CHIPS}
                      aria-pressed={on}
                      onClick={() =>
                        pick({ ...chips, items: on ? chips.items.filter((n) => n !== item.name) : [...chips.items, item.name] })
                      }
                    >
                      <span className="tray-name">{item.name}</span>
                      {item.tags.length > 0 && <span className="tray-desc">{item.tags.join(", ")}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">Nothing in your pack yet.</p>
          )}
        </div>
      )}

      <div className="composer">
        {(chipAbility || chips.items.length > 0) && (
          <div className="chips">
            {chipAbility && (
              <span className={`chip ability${pool === "MP" ? " mp" : ""}${c.energy >= chipAbility.cost ? "" : " short"}`}>
                <span aria-hidden>{"✦"}</span> {chipAbility.name}
                <button type="button" aria-label={`Remove ${chipAbility.name}`} onClick={() => onChips({ ...chips, ability: null })}>
                  {"×"}
                </button>
              </span>
            )}
            {chips.items.map((name) => (
              <span key={name} className="chip item">
                <span aria-hidden>{"◆"}</span> {name}
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  onClick={() => onChips({ ...chips, items: chips.items.filter((n) => n !== name) })}
                >
                  {"×"}
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={chipAbility ? `What do you do with ${chipAbility.name}?` : "What do you do?"}
          aria-label="What do you do?"
          rows={1}
          maxLength={MAX_PLAYER_INPUT_LENGTH}
          enterKeyHint="send"
        />
        <div className="composer-row">
          <button
            type="button"
            className={tray === "abilities" ? "selector on" : "selector"}
            aria-expanded={tray === "abilities"}
            onClick={() => setTray(tray === "abilities" ? null : "abilities")}
          >
            <span aria-hidden>{"✦"}</span> {noun}
          </button>
          <button
            type="button"
            className={tray === "pack" ? "selector on" : "selector"}
            aria-expanded={tray === "pack"}
            onClick={() => setTray(tray === "pack" ? null : "pack")}
          >
            <span aria-hidden>{"◆"}</span> Pack
          </button>
          <button type="submit" className="send" disabled={!draft.trim() || sending}>
            Go
          </button>
        </div>
      </div>
    </form>
  );
}
