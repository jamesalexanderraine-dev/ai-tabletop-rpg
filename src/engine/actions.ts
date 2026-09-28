// The composer's chips (docs/UPDATES.md, "Abilities work as a reference (chip),
// not a commit"). An ability chip means "use this for what I'm about to do": the
// engine checks it and spends its cost before the DM writes a word, so an
// explicit ability is never left to the model's judgement. Item chips point at
// things in the pack. Typing an ability without a chip still works: the DM
// recognizes it and calls use_ability, at the same cost.

import { MAX_ITEM_CHIPS, type Change, type GameState } from "./game";
import { abilityFor, abilityNoun } from "./progression";
import { applyDmTool } from "./tools";

export interface ActionChips {
  ability?: string; // ability id
  items?: string[]; // item names
}

export interface PreparedAction {
  state: GameState; // with the ability's cost already spent
  ability?: string;
  items?: string[];
  change?: Change; // shown in the story, like any other change
  note: string; // for the DM, ahead of the player's words ("" when there are no chips)
}

export type PrepareOutcome = { ok: true; value: PreparedAction } | { ok: false; error: string };

export function prepareAction(state: GameState, chips: ActionChips): PrepareOutcome {
  const c = state.character;
  const notes: string[] = [];
  let working = state;
  let change: Change | undefined;

  let ability: string | undefined;
  if (chips.ability !== undefined) {
    const info = typeof chips.ability === "string" ? abilityFor(c, chips.ability) : undefined;
    if (!info || !c.abilities.includes(info.id)) {
      return { ok: false, error: `You don't know that ${abilityNoun(c)}.` };
    }
    const applied = applyDmTool(state, "use_ability", { ability: info.id }, { rollsSoFar: 0 });
    if (!applied.ok) {
      return { ok: false, error: `Not enough ${abilityNoun(c) === "spell" ? "MP" : "stamina"} for ${info.name} (it costs ${info.cost}, you have ${c.energy}).` };
    }
    working = applied.state;
    change = applied.change;
    ability = info.id;
    notes.push(
      `[The player is using ${info.name} for this action. The engine has already applied it and spent its cost: ${applied.message} ` +
        "Don't call use_ability for it again this turn; narrate it working as part of what they describe.]",
    );
  }

  let items: string[] | undefined;
  if (chips.items !== undefined) {
    if (!Array.isArray(chips.items) || chips.items.length > MAX_ITEM_CHIPS) {
      return { ok: false, error: `Pick up to ${MAX_ITEM_CHIPS} things from your pack.` };
    }
    items = [];
    for (const name of chips.items) {
      const item = typeof name === "string" ? state.inventory.find((i) => i.name.toLowerCase() === name.toLowerCase()) : undefined;
      if (!item) return { ok: false, error: `${typeof name === "string" ? name : "That"} isn't in your pack any more.` };
      if (!items.includes(item.name)) items.push(item.name);
    }
    if (items.length) {
      notes.push(`[Using from their pack: ${items.join(", ")}. The player has these; use them as part of the action.]`);
    } else {
      items = undefined;
    }
  }

  return { ok: true, value: { state: working, ability, items, change, note: notes.join("\n") } };
}
