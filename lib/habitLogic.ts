// Scheduling and streak rules, shared by the server and the browser.
import { addDays, dow, weekStart } from "./dates";
import type { Habit } from "./types";

export type HabitLike = Pick<Habit, "repeat" | "timesPerWeek" | "days" | "goal" | "startDate">;
export type Counts = Map<string, number>;

export function isScheduled(h: HabitLike, key: string): boolean {
  if (h.startDate && key < h.startDate) return false;
  if (h.repeat === "days") return (h.days ?? []).includes(dow(key));
  return true;
}

export function doneOn(h: HabitLike, counts: Counts, key: string): boolean {
  return (counts.get(key) ?? 0) >= Math.max(1, h.goal || 1);
}

/** Completed days in the week of `key`, up to and including `key`. */
export function weekDone(h: HabitLike, counts: Counts, key: string): number {
  const ws = weekStart(key);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const k = addDays(ws, i);
    if (k > key) break;
    if (doneOn(h, counts, k)) n++;
  }
  return n;
}

export function streaks(h: HabitLike, counts: Counts, today: string): { current: number; best: number; unit: "day" | "week" } {
  const floor = h.startDate && h.startDate <= today ? h.startDate : addDays(today, -400);

  if (h.repeat === "weekly") {
    const target = Math.max(1, h.timesPerWeek || 1);
    const met = (ws: string) => {
      let n = 0;
      for (let i = 0; i < 7; i++) if (doneOn(h, counts, addDays(ws, i))) n++;
      return n >= target;
    };
    const firstWeek = weekStart(floor);
    const thisWeek = weekStart(today);
    let ws = thisWeek;
    if (!met(ws)) ws = addDays(ws, -7);
    let current = 0;
    while (ws >= firstWeek && met(ws)) {
      current++;
      ws = addDays(ws, -7);
    }
    let best = 0;
    let run = 0;
    for (let w = firstWeek; w <= thisWeek; w = addDays(w, 7)) {
      if (met(w)) {
        run++;
        best = Math.max(best, run);
      } else if (w !== thisWeek) run = 0;
    }
    return { current, best: Math.max(best, current), unit: "week" };
  }

  let k = today;
  if (isScheduled(h, k) && !doneOn(h, counts, k)) k = addDays(k, -1);
  let current = 0;
  while (k >= floor) {
    if (isScheduled(h, k)) {
      if (doneOn(h, counts, k)) current++;
      else break;
    }
    k = addDays(k, -1);
  }
  let best = 0;
  let run = 0;
  for (let d = floor; d <= today; d = addDays(d, 1)) {
    if (!isScheduled(h, d)) continue;
    if (doneOn(h, counts, d)) {
      run++;
      best = Math.max(best, run);
    } else if (d !== today) run = 0;
  }
  return { current, best: Math.max(best, current), unit: "day" };
}

/** Share of scheduled days completed over the last `days` days (0–100). */
export function completionRate(h: HabitLike, counts: Counts, today: string, days = 30): number | null {
  let scheduled = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const k = addDays(today, -i);
    if (h.startDate && k < h.startDate) break;
    if (h.repeat === "weekly") {
      if (doneOn(h, counts, k)) done++;
      continue;
    }
    if (!isScheduled(h, k)) continue;
    if (k === today && !doneOn(h, counts, k)) continue;
    scheduled++;
    if (doneOn(h, counts, k)) done++;
  }
  if (h.repeat === "weekly") {
    const weeks = Math.max(1, Math.round(days / 7));
    return Math.min(100, Math.round((done / (weeks * Math.max(1, h.timesPerWeek))) * 100));
  }
  return scheduled ? Math.round((done / scheduled) * 100) : null;
}

export function repeatLabel(h: Pick<Habit, "repeat" | "timesPerWeek" | "days">): string {
  if (h.repeat === "daily") return "Every day";
  if (h.repeat === "weekly") return `${h.timesPerWeek}× a week`;
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = [...(h.days ?? [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (d.length === 5 && !d.includes(0) && !d.includes(6)) return "Weekdays";
  if (d.length === 2 && d.includes(0) && d.includes(6)) return "Weekends";
  return d.map((x) => names[x]).join(", ");
}
