import type { NextRequest } from "next/server";
import { Mood, Todo } from "@/models";
import { HttpError, ok, withUser } from "@/lib/server";
import { addDays, isKey } from "@/lib/dates";
import { byTime, habitToday, loadHabits } from "@/lib/habitsServer";
import { pointsFor } from "@/lib/points";

export async function GET(req: NextRequest) {
  return withUser(async (uid) => {
    const date = req.nextUrl.searchParams.get("date");
    if (!isKey(date)) throw new HttpError(400, "Add ?date=YYYY-MM-DD");
    const { habits, counts } = await loadHabits(uid, addDays(date, -400), date);
    const list = habits
      .map((h) => habitToday(h, counts.get(h._id) ?? new Map(), date))
      .filter((h) => h.scheduled)
      .sort(byTime);
    const [todos, mood, p] = await Promise.all([
      Todo.find({ userId: uid, date }).sort({ startTime: 1, createdAt: 1 }).lean(),
      Mood.findOne({ userId: uid, date }).lean(),
      pointsFor(uid),
    ]);
    return ok({ date, habits: list, todos, mood, points: p.points });
  });
}
