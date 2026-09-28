"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  MAX_PLAYER_INPUT_LENGTH,
  type Change,
  newGame,
  type GameState,
  type GameSummary,
  type Roll,
  type Turn,
} from "@/engine/game";
import { archetypeInfo, pendingLevelUps, type Archetype, type LevelUpChoice } from "@/engine/progression";
import {
  createGame,
  leaveGame,
  levelUpOnServer,
  listGames,
  loadSaves,
  openGame,
  saveInBrowser,
  type SaveStorage,
} from "./saves";
import { StartScreen } from "./StartScreen";
import { DiceRoll } from "./Dice";
import { LevelUp } from "./LevelUp";
import { CharacterSheet, Meter } from "./Sheet";
import { readTurnEvents } from "./turnStream";


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
  const [live, setLive] = useState<LiveTurn | null>(null);
  const pendingInput = live?.input ?? null;
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<"sheet" | "levelup" | null>(null);
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
  // On load, show the latest turn from its first line.
  const loaded = game != null;
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

  function resizeInput() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const input = draft.trim();
    if (!game || !input || live) return;
    setLive({ input, rolls: [], landed: 0, text: "", result: null });
    setDraft("");
    setError(null);
    requestAnimationFrame(resizeInput);
    const update = (fn: (l: LiveTurn) => LiveTurn) => setLive((l) => (l ? fn(l) : l));
    try {
      const response = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameId ? { gameId, input } : { state: game, input }),
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
      requestAnimationFrame(resizeInput);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  function startOver() {
    const message =
      storage === "server"
        ? "Leave this game? It stays saved, and you can continue it from the start screen."
        : "Start a new game? This one will be lost.";
    if (!confirm(message)) return;
    leaveGame(storage);
    setGame(null);
    setGameId(null);
    setError(null);
    setDraft("");
    setOpen(null);
    if (storage === "server") listGames().then(setSaved).catch(() => undefined);
  }

  async function start(archetype: Archetype) {
    setStartError(null);
    if (storage === "browser") {
      setGame(newGame(archetype));
      return;
    }
    setStarting(true);
    try {
      const created = await createGame(archetype);
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

  async function applyLevelUp(next: GameState, choice: LevelUpChoice): Promise<GameState> {
    const saved = gameId ? await levelUpOnServer(gameId, choice) : next;
    setGame(saved);
    return saved;
  }

  if (game === undefined) return <main className="game" />;
  if (game === null) {
    return <StartScreen saved={saved} onContinue={resume} onPick={start} busy={starting} error={startError} />;
  }
  const c = game.character;
  const levelUpsWaiting = pendingLevelUps(game);

  return (
    <main className="game">
      <header className="bar">
        <div className="status">
          <span className="who">
            {c.name ?? "A stranger"} <span className="lv">Lv {c.level}</span>
          </span>
          <Meter label="Health" value={c.hp} max={c.maxHp} kind="hp" />
          <Meter
            label={archetypeInfo(c.archetype).pool === "MP" ? "Magic" : "Stamina"}
            value={c.energy}
            max={c.maxEnergy}
            kind={archetypeInfo(c.archetype).pool === "MP" ? "mp" : "stamina"}
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
          <TurnView key={i} turn={turn} first={i === 0} />
        ))}
        {live && <LiveTurnView live={live} onLanded={() => setLive((l) => (l ? { ...l, landed: l.landed + 1 } : l))} />}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>

      <form className="compose" onSubmit={send}>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            resizeInput();
          }}
          onKeyDown={onKeyDown}
          placeholder="What do you do?"
          aria-label="What do you do?"
          rows={1}
          maxLength={MAX_PLAYER_INPUT_LENGTH}
          enterKeyHint="send"
        />
        <button type="submit" disabled={!draft.trim() || pendingInput !== null}>
          Go
        </button>
      </form>

      {open === "sheet" && (
        <CharacterSheet
          game={game}
          onClose={() => setOpen(null)}
          onNewGame={startOver}
          newGameLabel={storage === "server" ? "Back to the start screen" : "Start a new game"}
          busy={pendingInput !== null}
        />
      )}
      {open === "levelup" && <LevelUp game={game} onApply={applyLevelUp} onClose={() => setOpen(null)} />}
    </main>
  );
}

function TurnView({ turn, first }: { turn: Turn; first: boolean }) {
  return (
    <section className="turn">
      {turn.player && <p className="player">{turn.player}</p>}
      {turn.rolls.map((roll, i) => (
        <DiceRoll key={i} roll={roll} />
      ))}
      <div className={first ? "narration opening" : "narration"}>
        {turn.narration.split(/\n\s*\n/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
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
  rolls: Roll[];
  landed: number;
  text: string;
  result: GameState | null;
}

function LiveTurnView({ live, onLanded }: { live: LiveTurn; onLanded: () => void }) {
  const diceSettled = live.landed >= live.rolls.length;
  const text = diceSettled ? live.text.trim() : "";
  return (
    <section className="turn">
      <p className="player">{live.input}</p>
      {live.rolls.map((roll, i) => (
        <DiceRoll key={i} roll={roll} animate onLanded={onLanded} />
      ))}
      {text ? (
        <div className="narration">
          {text.split(/\n\s*\n/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      ) : (
        diceSettled && <p className="thinking">{live.rolls.length ? "The DM weighs the result…" : "The DM considers this…"}</p>
      )}
    </section>
  );
}
