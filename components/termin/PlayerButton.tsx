"use client";

import { useRef } from "react";

const LONG_PRESS_MS = 600;

/**
 * Player button on the live screen.
 *
 *   tap            -> goal
 *   long press     -> own goal
 *   tap on 🧤      -> goalkeeper change
 *
 * Height is 56 px because this screen is used standing, one-handed, outdoors.
 */
export function PlayerButton({
  nickname,
  goals,
  team,
  isGoalkeeper,
  canBeGoalkeeper = true,
  disabled,
  onGoal,
  onOwnGoal,
  onGoalkeeper,
}: {
  nickname: string;
  goals: number;
  team: "A" | "B";
  isGoalkeeper: boolean;
  /** False for outfield players — glove is hidden so accidental taps cannot steal GK. */
  canBeGoalkeeper?: boolean;
  disabled?: boolean;
  onGoal: () => void;
  onOwnGoal: () => void;
  onGoalkeeper: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  function onPointerStart() {
    if (disabled) return;
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      // Short vibration as confirmation — outdoors the screen often is not watched.
      navigator.vibrate?.(40);
      onOwnGoal();
    }, LONG_PRESS_MS);
  }

  function onPointerEnd() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function onClick() {
    if (disabled) return;
    // After a long press the browser also fires a click — skip it.
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    onGoal();
  }

  const teamTone =
    team === "A" ? "border-sky-200 bg-sky-50" : "border-amber-200 bg-amber-50";

  return (
    <div
      className={
        "flex items-stretch gap-1 rounded-lg border " +
        (isGoalkeeper
          ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-400/30"
          : teamTone)
      }
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        onPointerDown={onPointerStart}
        onPointerUp={onPointerEnd}
        onPointerLeave={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onContextMenu={(e) => e.preventDefault()}
        className={
          "flex h-14 min-w-0 flex-1 items-center justify-between gap-2 px-3 " +
          "text-left text-base font-bold uppercase tracking-tight " +
          "transition select-none active:scale-[0.97] disabled:opacity-40 " +
          (canBeGoalkeeper ? "" : "rounded-r-lg")
        }
        style={{ WebkitTouchCallout: "none" }}
        aria-label={`Gol za ${nickname}. Dugi pritisak upisuje autogol.`}
      >
        <span className="min-w-0 truncate">{nickname}</span>
        {goals > 0 && (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-500">
            ⚽{goals}
          </span>
        )}
      </button>

      {canBeGoalkeeper && (
        <button
          type="button"
          disabled={disabled}
          onClick={onGoalkeeper}
          className={
            "w-11 shrink-0 rounded-r-lg text-lg transition active:scale-95 disabled:opacity-40 " +
            (isGoalkeeper ? "bg-emerald-100" : "opacity-25 hover:opacity-60")
          }
          aria-label={isGoalkeeper ? `${nickname} je golman` : `Postavi ${nickname} za golmana`}
          title={isGoalkeeper ? "Golman" : "Postavi za golmana"}
        >
          🧤
        </button>
      )}
    </div>
  );
}
