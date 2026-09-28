import type { NextRequest } from "next/server";
import { HttpError, ok, withUser } from "@/lib/server";
import { addDays, isKey } from "@/lib/dates";
import { byTime, loadHabits } from "@/lib/habitsServer";
import { doneOn, isScheduled } from "@/lib/habitLogic";
import { loadTodos } from "@/lib/todos";

export async function GET(req: NextRequest) {
  return withUser(async (uid) => {
    const start = req.nextUrl.searchParams.get("start");
    const today = req.nextUrl.searchParams.get("today");
    if (!isKey(start) || !isKey(today)) throw new HttpError(400, "Add ?start=YYYY-MM-DD&today=YYYY-MM-DD");
    const end = addDays(start, 6);
    const { habits, counts } = await loadHabits(uid, start, end);
    const todos = await loadTodos(uid, start, end);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(start, i);
      const items = habits
        .filter((h) => isScheduled(h, date))
        .map((h) => ({
          _id: h._id, name: h.name, color: h.color, icon: h.icon, startTime: h.startTime, endTime: h.endTime,
          repeat: h.repeat, done: doneOn(h, counts.get(h._id) ?? new Map(), date),
        }))
        .sort(byTime);
      const countable = items.filter((x) => x.repeat !== "weekly" || x.done);
      const pct = date <= today && countable.length ? Math.round((countable.filter((x) => x.done).length / countable.length) * 100) : null;
      days.push({ date, habits: items, todos: todos.filter((t) => t.date === date), pct });
    }
    return ok({ start, days });
  });
}
