import { Habit as HabitModel, HabitLog } from "@/models";
import { isScheduled, streaks, weekDone, type Counts } from "./habitLogic";
import { HttpError, num, str } from "./server";
import { isKey, isTime } from "./dates";
import { CATEGORIES, ICONS, TONES } from "./catalog";
import type { Habit, HabitToday, Repeat } from "./types";

export function serializeHabit(h: Record<string, unknown>): Habit {
  return {
    _id: String(h._id),
    name: String(h.name ?? ""),
    icon: String(h.icon ?? "check"),
    color: String(h.color ?? "sage"),
    category: String(h.category ?? "health"),
    startTime: String(h.startTime ?? ""),
    endTime: String(h.endTime ?? ""),
    repeat: (h.repeat as Repeat) ?? "daily",
    timesPerWeek: Number(h.timesPerWeek ?? 3),
    days: (h.days as number[]) ?? [],
    goal: Number(h.goal ?? 1),
    unit: String(h.unit ?? ""),
    reminder: Boolean(h.reminder),
    startDate: String(h.startDate ?? ""),
  };
}

/** Loads a user's habits plus their logs from `from` to `to` (inclusive). */
export async function loadHabits(uid: string, from: string, to: string) {
  const docs = await HabitModel.find({ userId: uid }).sort({ startTime: 1, createdAt: 1 }).lean();
  const habits = (docs as Record<string, unknown>[]).map(serializeHabit);
  const logs = (await HabitLog.find({ userId: uid, date: { $gte: from, $lte: to } }).lean()) as unknown as {
    habitId: unknown;
    date: string;
    count: number;
  }[];
  const counts = new Map<string, Counts>();
  for (const l of logs) {
    const id = String(l.habitId);
    if (!counts.has(id)) counts.set(id, new Map());
    counts.get(id)!.set(l.date, l.count);
  }
  return { habits, counts };
}

export function habitToday(h: Habit, counts: Counts, key: string): HabitToday {
  const count = counts.get(key) ?? 0;
  const s = streaks(h, counts, key);
  return {
    ...h,
    count,
    done: count >= Math.max(1, h.goal),
    scheduled: isScheduled(h, key),
    streak: s.current,
    best: s.best,
    streakUnit: s.unit,
    weekDone: weekDone(h, counts, key),
  };
}

export function byTime(a: { startTime: string }, b: { startTime: string }) {
  if (!a.startTime && !b.startTime) return 0;
  if (!a.startTime) return 1;
  if (!b.startTime) return -1;
  return a.startTime.localeCompare(b.startTime);
}

/** Validates habit input from the client. `partial` allows updates with only some fields. */
export function parseHabitInput(b: Record<string, unknown>, partial = false) {
  const out: Record<string, unknown> = {};
  if (!partial || "name" in b) {
    const name = str(b.name, 80);
    if (!name) throw new HttpError(400, "Give the habit a name.");
    out.name = name;
  }
  if ("icon" in b) out.icon = ICONS.includes(String(b.icon)) ? String(b.icon) : "check";
  if ("color" in b) out.color = TONES.some((t) => t.key === b.color) ? String(b.color) : "sage";
  if ("category" in b) out.category = CATEGORIES.some((c) => c.key === b.category) ? String(b.category) : "other";
  if ("startTime" in b || "endTime" in b) {
    const s = b.startTime === "" || b.startTime == null ? "" : b.startTime;
    const e = b.endTime === "" || b.endTime == null ? "" : b.endTime;
    if (s && !isTime(s)) throw new HttpError(400, "The 'from' time must look like 07:30.");
    if (e && !isTime(e)) throw new HttpError(400, "The 'to' time must look like 08:00.");
    if (e && !s) throw new HttpError(400, "Add a 'from' time before the 'to' time.");
    out.startTime = s;
    out.endTime = e;
  }
  if ("repeat" in b) {
    const r = String(b.repeat);
    if (!["daily", "weekly", "days"].includes(r)) throw new HttpError(400, "Repeat must be daily, weekly or days.");
    out.repeat = r;
  }
  if ("timesPerWeek" in b) out.timesPerWeek = num(b.timesPerWeek, 1, 7, 3);
  if ("days" in b) {
    const days = Array.isArray(b.days) ? [...new Set(b.days.map(Number).filter((d) => d >= 0 && d <= 6))] : [];
    out.days = days;
  }
  if (out.repeat === "days" && Array.isArray(out.days) && out.days.length === 0) {
    throw new HttpError(400, "Pick at least one day.");
  }
  if ("goal" in b) out.goal = num(b.goal, 1, 100, 1);
  if ("unit" in b) out.unit = str(b.unit, 20);
  if ("reminder" in b) out.reminder = Boolean(b.reminder);
  if ("startDate" in b && isKey(b.startDate)) out.startDate = b.startDate;
  return out;
}
