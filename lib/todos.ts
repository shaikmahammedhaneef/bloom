import { Todo } from "@/models";
import { HttpError, str } from "./server";
import { addDays, dow, isKey, isTime } from "./dates";
import type { Todo as TodoItem, TodoRepeat } from "./types";

const REPEATS: TodoRepeat[] = ["none", "daily", "days"];

export function parseTodo(b: Record<string, unknown>, partial = false) {
  const out: Record<string, unknown> = {};
  if (!partial || "title" in b) {
    const t = str(b.title, 140);
    if (!t) throw new HttpError(400, "Write what you need to do.");
    out.title = t;
  }
  if (!partial || "date" in b) {
    if (!isKey(b.date)) throw new HttpError(400, "Pick a date.");
    out.date = b.date;
  }
  if ("startTime" in b || "endTime" in b) {
    const s = b.startTime || "";
    const e = b.endTime || "";
    if (s && !isTime(s)) throw new HttpError(400, "The 'from' time must look like 10:00.");
    if (e && !isTime(e)) throw new HttpError(400, "The 'to' time must look like 10:30.");
    if (e && !s) throw new HttpError(400, "Add a 'from' time before the 'to' time.");
    out.startTime = s;
    out.endTime = e;
  }
  if ("endDate" in b) {
    const e = b.endDate || "";
    if (e && !isKey(e)) throw new HttpError(400, "Pick a valid end date.");
    if (e && isKey(out.date) && e < out.date) throw new HttpError(400, "The end date can't be before the start date.");
    out.endDate = e;
  }
  if ("done" in b) out.done = Boolean(b.done);
  if ("reminder" in b) out.reminder = Boolean(b.reminder);
  if ("repeat" in b) {
    const r = b.repeat as TodoRepeat;
    if (!REPEATS.includes(r)) throw new HttpError(400, "Repeat must be none, daily or days.");
    out.repeat = r;
    const days = Array.isArray(b.days) ? [...new Set(b.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] : [];
    if (r === "days" && !days.length) throw new HttpError(400, "Pick at least one day.");
    out.days = r === "days" ? days.sort() : [];
  }
  return out;
}

export type TodoDoc = {
  _id: unknown;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  done: boolean;
  reminder: boolean;
  endDate?: string;
  repeat?: TodoRepeat;
  days?: number[];
  doneDates?: string[];
  skipDates?: string[];
};

export const repeats = (t: { repeat?: string }) => t.repeat === "daily" || t.repeat === "days";

/** Whether a to-do shows up on a given day. */
export function occursOn(t: TodoDoc, date: string): boolean {
  if (date < t.date || (t.endDate && date > t.endDate) || t.skipDates?.includes(date)) return false;
  if (!repeats(t)) return t.endDate ? true : t.date === date;
  return t.repeat === "daily" || (t.days ?? []).includes(dow(date));
}

/** The to-do as it looks on one day. Repeating to-dos keep their id; `date` is that day. */
export function occurrence(t: TodoDoc, date: string): TodoItem {
  return {
    _id: String(t._id),
    title: t.title,
    date,
    startTime: t.startTime ?? "",
    endTime: t.endTime ?? "",
    reminder: Boolean(t.reminder),
    repeat: repeats(t) ? (t.repeat as TodoRepeat) : "none",
    days: t.days ?? [],
    startDate: t.date,
    endDate: t.endDate ?? "",
    done: repeats(t) ? Boolean(t.doneDates?.includes(date)) : Boolean(t.done),
  };
}

const byStart = (a: TodoItem, b: TodoItem) =>
  a.date.localeCompare(b.date) || (a.startTime || "99").localeCompare(b.startTime || "99") || a.title.localeCompare(b.title);

/** All to-dos from `from` to `to` (inclusive), with repeating ones expanded day by day. */
export async function loadTodos(uid: string, from: string, to: string, extra: Record<string, unknown> = {}): Promise<TodoItem[]> {
  const docs = (await Todo.find({
    userId: uid,
    ...extra,
    date: { $lte: to },
    // Starts in the range, or started earlier and repeats or runs over several days into it.
    $or: [{ date: { $gte: from } }, { endDate: { $gte: from } }, { repeat: { $in: ["daily", "days"] }, endDate: { $in: ["", null] } }],
  })
    .sort({ createdAt: 1 })
    .lean()) as unknown as TodoDoc[];
  const out: TodoItem[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (const t of docs) if (occursOn(t, d)) out.push(occurrence(t, d));
  }
  return out.sort(byStart);
}
