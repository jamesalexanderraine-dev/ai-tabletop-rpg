"use client";

import { useEffect, useRef, useState } from "react";
import {
  type Change,
  newGame,
  type GameState,
  type GameSummary,
  type Roll,
  type Turn,
} from "@/engine/game";
import {
  abilityFor,
  pendingLevelUps,
  poolOf,
  type BuiltInArchetype,
  type CustomArchetype,
  type LevelUpChoice,
} from "@/engine/progression";
import { CharacterSwitcher } from "./Characters";
import { Composer, NO_CHIPS, type Chips } from "./Composer";
import {
  createGame,
  deleteGame,
  leaveGame,
  levelUpOnServer,
  listGames,
  loadDmModel,
  loadSaves,
  openGame,
  saveDmModel,
  saveInBrowser,
  type SaveStorage,
} from "./saves";
import { StartScreen } from "./StartScreen";
import { DiceRoll } from "./Dice";
import { LevelUp } from "./LevelUp";
import { Narration } from "./Narration";
import { CharacterSheet, Meter } from "./Sheet";
import { readTurnEvents } from "./turnStream";
import { DEFAULT_DM_MODEL, type DmModelId } from "@/shared/dmModels";


function distanceFromEnd(): number {
  const page = document.scrollingElement ?? document.documentElement;
  return page.scrollHeight - page.scrollTop - window.innerHeight;
}

// Scroll to the very end of the page, where the story sits just above the input
// bar. (Lining the story's end up with the bottom of the screen would leave the
// newest line hidden behind the bar, which is pinned over that strip.)
function scrollToEnd(behavior: ScrollBehavior) {
  const page = document.scrollingElement ?? document.documentElement;
  requestAnimationFrame(() => window.scrollTo({ top: page.scrollHeight, behavior }));
}

export default function Game() {
  // undefined while loading; null on the start screen.
  const [game, setGame] = useState<GameState | null | undefined>(undefined);
  const [storage, setStorage] = useState<SaveStorage>("browser");
  const [gameId, setGameId] = useState<string | null>(null);
  const [saved, setSaved] = useState<GameSummary[]>([]);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [draft, setDraft] = useState("");
  const [chips, setChips] = useState<Chips>(NO_CHIPS);
  const [live, setLive] = useState<LiveTurn | null>(null);
  const pendingInput = live?.input ?? null;
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<"sheet" | "levelup" | "characters" | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  // Read after mount: the server render can't see this browser's storage.
  const [dmModel, setDmModel] = useState<DmModelId>(DEFAULT_DM_MODEL);
  useEffect(() => setDmModel(loadDmModel()), []);
  // Whether the page should keep following the newest content, like a chat reply.
  // Scrolling up to reread turns it off; scrolling back to the end turns it on.
  const following = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadSaves()
      .then(({ storage, games, current }) => {
        setStorage(storage);
        setSaved(games);
        setGameId(current?.id ?? null);
        setGame(current?.state ?? null);
      })
      .catch((err: unknown) => {
        setStartError(err instanceof Error ? err.message : "Couldn't load your saved games.");
        setGame(null);
      });
  }, []);
  // In browser mode the game is kept here; in server mode the server saves it
  // after every turn and level-up.
  useEffect(() => {
    if (game && storage === "browser") saveInBrowser(game);
  }, [game, storage]);
  // On load (or switching character), show the latest turn from its first line.
  const loaded = game == null ? null : (gameId ?? "browser");
  useEffect(() => {
    if (loaded) document.querySelector(".story > .turn:last-of-type")?.scrollIntoView({ block: "start" });
  }, [loaded]);
  useEffect(() => {
    // Only the player's own scrolling (a touch or a mouse wheel, until the page
    // settles) changes whether we follow. The page's own smooth scrolls pass
    // through positions that would otherwise switch it off.
    let playerScrolling = false;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const onGesture = () => {
      playerScrolling = true;
    };
    const onScroll = () => {
      if (!playerScrolling) return;
      following.current = distanceFromEnd() < 80;
      clearTimeout(settle);
      settle = setTimeout(() => {
        playerScrolling = false;
      }, 200);
    };
    const opts = { passive: true };
    window.addEventListener("touchstart", onGesture, opts);
    window.addEventListener("wheel", onGesture, opts);
    window.addEventListener("scroll", onScroll, opts);
    return () => {
      clearTimeout(settle);
      window.removeEventListener("touchstart", onGesture);
      window.removeEventListener("wheel", onGesture);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  // While a turn plays out, follow it down the page as dice arrive and land and
  // text comes in, unless the player has scrolled up to read.
  const shownText = live && live.landed >= live.rolls.length ? live.text.length : 0;
  useEffect(() => {
    if (!pendingInput) return;
    following.current = true;
    scrollToEnd("smooth");
  }, [pendingInput]);
  useEffect(() => {
    if (following.current && (live || error)) scrollToEnd("smooth");
  }, [live?.rolls.length, live?.landed, error]);
  useEffect(() => {
    if (following.current && shownText) scrollToEnd("auto");
  }, [shownText]);
  // The finished turn replaces the live one once every die has landed.
  useEffect(() => {
    if (live?.result && live.landed >= live.rolls.length) {
      setGame(live.result);
      setLive(null);
    }
  }, [live]);

  // Items used up or lost drop out of the chips.
  const inventoryKey = game ? game.inventory.map((i) => i.name).join("\n") : "";
  useEffect(() => {
    const names = inventoryKey.split("\n");
    setChips((ch) => (ch.items.every((n) => names.includes(n)) ? ch : { ...ch, items: ch.items.filter((n) => names.includes(n)) }));
  }, [inventoryKey]);

  async function send() {
    const input = draft.trim();
    if (!game || !input || live) return;
    const sent = chips;
    const chipped = { ability: sent.ability ?? undefined, items: sent.items.length ? sent.items : undefined };
    setLive({ input, ...chipped, rolls: [], landed: 0, text: "", result: null });
    setDraft("");
    setChips(NO_CHIPS);
    setError(null);
    const update = (fn: (l: LiveTurn) => LiveTurn) => setLive((l) => (l ? fn(l) : l));
    try {
      const response = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(gameId ? { gameId } : { state: game }), input, ...chipped, model: dmModel }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "The DM didn't answer. Try again.");
      }
      let finished = false;
      await readTurnEvents(response, (e) => {
        if (e.type === "roll") update((l) => ({ ...l, rolls: [...l.rolls, e.roll] }));
        else if (e.type === "text") update((l) => ({ ...l, text: l.text + e.delta }));
        else if (e.type === "discard") update((l) => ({ ...l, text: "" }));
        else if (e.type === "error") throw new Error(e.error);
        else if (e.type === "done") {
          finished = true;
          update((l) => ({ ...l, text: e.turn.narration, result: e.state }));
        }
      });
      if (!finished) throw new Error("The DM's reply was cut off. Try again.");
    } catch (err) {
      setLive(null);
      setError(err instanceof Error ? err.message : "The DM didn't answer. Try again.");
      setDraft(input);
      setChips(sent);
    }
  }

  // Back to the start screen. On the server the game stays saved; in the browser
  // it's replaced, so ask first.
  function startOver() {
    if (storage === "browser" && !confirm("Start a new game? This one will be lost.")) return;
    leaveGame(storage);
    setGame(null);
    setGameId(null);
    setError(null);
    setDraft("");
    setChips(NO_CHIPS);
    setOpen(null);
    if (storage === "server") listGames().then(setSaved).catch(() => undefined);
  }

  async function start(choice: BuiltInArchetype | CustomArchetype) {
    setStartError(null);
    if (storage === "browser") {
      setGame(newGame(choice));
      return;
    }
    setStarting(true);
    try {
      const created = await createGame(choice);
      setGameId(created.id);
      setGame(created.state);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Couldn't start a new game. Try again.");
    } finally {
      setStarting(false);
    }
  }

  async function resume(id: string) {
    setStartError(null);
    setStarting(true);
    try {
      const state = await openGame(id);
      setGameId(id);
      setGame(state);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Couldn't load that game. Try again.");
    } finally {
      setStarting(false);
    }
  }

  // Swap to another saved character mid-game.
  async function switchTo(id: string) {
    setSwitchError(null);
    setStarting(true);
    try {
      const state = await openGame(id);
      setGameId(id);
      setGame(state);
      setError(null);
      setDraft("");
      setChips(NO_CHIPS);
      setOpen(null);
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : "Couldn't load that character. Try again.");
    } finally {
      setStarting(false);
    }
  }

  // Delete a saved character for good, after asking. Returns whether it went.
  async function remove(target: GameSummary): Promise<boolean> {
    if (!confirm(`Delete ${target.name ?? "this stranger"} for good? This can't be undone.`)) return false;
    const setErr = game ? setSwitchError : setStartError;
    setErr(null);
    try {
      await deleteGame(target.id);
      setSaved((games) => games.filter((g) => g.id !== target.id));
      return true;
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Couldn't delete that character. Try again.");
      return false;
    }
  }

  async function applyLevelUp(next: GameState, choice: LevelUpChoice): Promise<GameState> {
    const saved = gameId ? await levelUpOnServer(gameId, choice) : next;
    setGame(saved);
    return saved;
  }

  if (game === undefined) return <main className="game" />;
  if (game === null) {
    return (
      <StartScreen saved={saved} onContinue={resume} onDelete={(g) => void remove(g)} onPick={start} busy={starting} error={startError} />
    );
  }
  const c = game.character;
  const levelUpsWaiting = pendingLevelUps(game);

  return (
    <main className="game">
      <header className="bar">
        <div className="status">
          {storage === "server" ? (
            <button
              type="button"
              className="who who-button"
              onClick={() => setOpen("characters")}
              disabled={pendingInput !== null}
              aria-label="Switch character"
            >
              {c.name ?? "A stranger"} <span className="lv">Lv {c.level}</span>
            </button>
          ) : (
            <span className="who">
              {c.name ?? "A stranger"} <span className="lv">Lv {c.level}</span>
            </span>
          )}
          <Meter label="Health" value={c.hp} max={c.maxHp} kind="hp" />
          <Meter
            label={poolOf(c) === "MP" ? "Magic" : "Stamina"}
            value={c.energy}
            max={c.maxEnergy}
            kind={poolOf(c) === "MP" ? "mp" : "stamina"}
          />
          <span className="where">{game.scene.name}</span>
        </div>
        <div className="bar-actions">
          {levelUpsWaiting > 0 && (
            <button type="button" className="levelup-button" onClick={() => setOpen("levelup")} disabled={pendingInput !== null}>
              Level up!
            </button>
          )}
          <button type="button" className="pack-button" onClick={() => setOpen("sheet")}>
            Sheet
          </button>
        </div>
      </header>

      <div className="story">
        {game.turns.map((turn, i) => (
          <TurnView key={i} turn={turn} first={i === 0} game={game} />
        ))}
        {live && <LiveTurnView live={live} game={game} onLanded={() => setLive((l) => (l ? { ...l, landed: l.landed + 1 } : l))} />}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>

      <Composer
        game={game}
        draft={draft}
        onDraft={setDraft}
        chips={chips}
        onChips={setChips}
        onSend={() => void send()}
        sending={pendingInput !== null}
        inputRef={inputRef}
      />

      {open === "sheet" && (
        <CharacterSheet
          game={game}
          onClose={() => setOpen(null)}
          onNewGame={storage === "server" ? () => setOpen("characters") : startOver}
          newGameLabel={storage === "server" ? "Switch character" : "Start a new game"}
          busy={pendingInput !== null}
          dmModel={dmModel}
          onDmModel={(m) => {
            setDmModel(m);
            saveDmModel(m);
          }}
        />
      )}
      {open === "levelup" && <LevelUp game={game} onApply={applyLevelUp} onClose={() => setOpen(null)} />}
      {open === "characters" && (
        <CharacterSwitcher
          currentId={gameId}
          onSwitch={(id) => void switchTo(id)}
          onNew={startOver}
          onDelete={remove}
          onClose={() => {
            setSwitchError(null);
            setOpen(null);
          }}
          busy={starting || pendingInput !== null}
          error={switchError}
        />
      )}
    </main>
  );
}

// What the player typed, in a speech bubble on their side, with any chips they
// attached. (Characters, the player's included, speak in pull quotes.)
function PlayerLine({ text, ability, items, game }: { text: string; ability?: string; items?: string[]; game: GameState }) {
  const abilityName = ability ? (abilityFor(game.character, ability)?.name ?? ability) : null;
  return (
    <div className="mine">
      <p className="bubble">
        {abilityName && (
          <span className={poolOf(game.character) === "MP" ? "chip ability mp" : "chip ability"}>
            <span aria-hidden>{"\u2726"}</span> {abilityName}
          </span>
        )}
        {items?.map((name) => (
          <span key={name} className="chip item">
            <span aria-hidden>{"\u25c6"}</span> {name}
          </span>
        ))}
        {text}
      </p>
    </div>
  );
}

function TurnView({ turn, first, game }: { turn: Turn; first: boolean; game: GameState }) {
  return (
    <section className="turn">
      {turn.player && <PlayerLine text={turn.player} ability={turn.ability} items={turn.items} game={game} />}
      {turn.rolls.map((roll, i) => (
        <DiceRoll key={i} roll={roll} />
      ))}
      <Narration text={turn.narration} game={game} opening={first} />
      {turn.changes.length > 0 && (
        <ul className="changes">
          {turn.changes.map((change, i) => (
            <ChangeNote key={i} change={change} />
          ))}
        </ul>
      )}
    </section>
  );
}

const CHANGE_GLYPHS: Record<Change["kind"], string> = {
  item: "\u25c6",
  vitals: "\u2665",
  npc: "\u263a",
  scene: "\u2691",
  spell: "\u2726",
  trait: "\u2605",
  note: "\u2022",
};

function ChangeNote({ change }: { change: Change }) {
  return (
    <li className={`change ${change.kind}`}>
      <span aria-hidden>{CHANGE_GLYPHS[change.kind]}</span> {change.text}
    </li>
  );
}

// A turn still being played out: dice tumble as the engine rolls them, and the
// narration appears (as it's written) only once every die has landed.
interface LiveTurn {
  input: string;
  ability?: string;
  items?: string[];
  rolls: Roll[];
  landed: number;
  text: string;
  result: GameState | null;
}

function LiveTurnView({ live, game, onLanded }: { live: LiveTurn; game: GameState; onLanded: () => void }) {
  const diceSettled = live.landed >= live.rolls.length;
  const text = diceSettled ? live.text.trim() : "";
  return (
    <section className="turn">
      <PlayerLine text={live.input} ability={live.ability} items={live.items} game={game} />
      {live.rolls.map((roll, i) => (
        <DiceRoll key={i} roll={roll} animate onLanded={onLanded} />
      ))}
      {text ? (
        <Narration text={text} game={game} />
      ) : (
        diceSettled && <p className="thinking">{live.rolls.length ? "The DM weighs the result…" : "The DM considers this…"}</p>
      )}
    </section>
  );
}
