"use client";

import { useEffect, useRef, useState } from "react";
import { capitalize, type Roll } from "@/engine/game";
import { skillInfo } from "@/engine/progression";

// The spin always lasts about this long, even when the result is already known,
// so every check gets its moment of suspense.
const SPIN_MS = 1600;

// A random face that differs from the one showing, so every tick visibly changes.
function otherFace(current: number): number {
  const next = 1 + Math.floor(Math.random() * 19);
  return next >= current ? next + 1 : next;
}

function outcomeText(roll: Roll): string {
  if (roll.critical === "success") return "Critical success!";
  if (roll.critical === "failure") return "Critical failure!";
  return roll.success ? "Success" : "Failure";
}

// A check the engine has already made. With `animate`, the d20 tumbles through
// random faces, slowing down, and lands on the real result.
export function DiceRoll({ roll, animate = false, onLanded }: { roll: Roll; animate?: boolean; onLanded?: () => void }) {
  const [face, setFace] = useState(animate ? 1 + Math.floor(Math.random() * 20) : roll.roll);
  const [landed, setLanded] = useState(!animate);
  const landedRef = useRef(onLanded);
  landedRef.current = onLanded;

  useEffect(() => {
    if (!animate) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const land = () => {
      setFace(roll.roll);
      setLanded(true);
      landedRef.current?.();
    };
    if (reduceMotion) {
      timers.push(setTimeout(land, 600));
    } else {
      // Ticks start fast and slow down, like a die running out of momentum.
      let elapsed = 0;
      for (let tick = 0; elapsed < SPIN_MS; tick++) {
        elapsed += 45 + tick * tick * 1.6;
        timers.push(
          setTimeout(() => setFace(otherFace), Math.min(elapsed, SPIN_MS)),
        );
      }
      timers.push(setTimeout(land, SPIN_MS + 120));
    }
    return () => timers.forEach(clearTimeout);
  }, [animate, roll.roll]);

  const mods = roll.statModifier + roll.skillBonus + roll.situationalBonus;
  const skill = roll.skill ? skillInfo(roll.skill)?.name : null;
  const state = !landed ? "rolling" : roll.success ? "win" : "lose";
  const crit = landed && roll.critical ? " crit" : "";

  return (
    <p className={`roll ${state}${crit}`} aria-live={animate ? "polite" : undefined}>
      <span className="die" aria-hidden>
        {face}
      </span>
      <span>
        <strong>
          {capitalize(roll.stat)}
          {skill && ` (${skill})`}
        </strong>{" "}
        · {roll.reason}
        <br />
        <span className="math">
          {landed ? (
            <>
              {roll.roll} {mods >= 0 ? "+" : "−"} {Math.abs(mods)} = {roll.total} vs {roll.target} · {outcomeText(roll)}
            </>
          ) : (
            <>Rolling vs {roll.target}…</>
          )}
        </span>
      </span>
    </p>
  );
}
