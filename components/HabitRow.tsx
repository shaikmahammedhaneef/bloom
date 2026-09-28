"use client";
import Link from "next/link";
import Icon from "./Icon";
import { Check, Tile } from "./ui";
import { timeRange } from "@/lib/dates";
import type { HabitToday } from "@/lib/types";

export default function HabitRow({ h, onSet, showStreak = true, disabled }: {
  h: HabitToday;
  onSet: (count: number) => void;
  showStreak?: boolean;
  disabled?: boolean;
}) {
  const multi = h.goal > 1;
  const meta: string[] = [];
  if (h.startTime) meta.push(timeRange(h.startTime, h.endTime));
  if (multi) meta.push(`${h.count} of ${h.goal}${h.unit ? " " + h.unit : ""}`);
  if (h.repeat === "weekly") meta.push(`${h.weekDone} of ${h.timesPerWeek} this week`);
  if (showStreak && h.streak > 0) meta.push(`${h.streak}-${h.streakUnit} streak`);
  return (
    <div className="row">
      <Tile icon={h.icon} tone={h.color} />
      <div className="grow">
        <div className={`row-title ${h.done ? "done-text" : ""}`}>
          <Link href={`/habits/${h._id}`}>{h.name}</Link>
        </div>
        {meta.length > 0 && <div className="row-meta">{meta.join("  ·  ")}</div>}
      </div>
      {multi ? (
        <div className="counter">
          <button type="button" className="icon-btn sm" aria-label={`Remove one from ${h.name}`} onClick={() => onSet(Math.max(0, h.count - 1))} disabled={disabled || h.count === 0}>
            <Icon name="minus" size={16} />
          </button>
          <button type="button" className={`icon-btn sm tone-${h.color}`} style={{ border: "none" }} aria-label={`Add one to ${h.name}`} onClick={() => onSet(h.count + 1)} disabled={disabled}>
            {h.done ? <Icon name="check" size={18} stroke={2.4} /> : <Icon name="plus" size={18} />}
          </button>
        </div>
      ) : (
        <Check done={h.done} label={h.name} onClick={() => onSet(h.done ? 0 : 1)} disabled={disabled} />
      )}
    </div>
  );
}
