import type { NextRequest } from "next/server";
import { Mood } from "@/models";
import { HttpError, ok, withUser } from "@/lib/server";
import { addDays, isKey } from "@/lib/dates";
import { byTime, habitToday, loadHabits } from "@/lib/habitsServer";
import { pointsFor } from "@/lib/points";
import { bestByDate } from "@/lib/moods";
import { loadTodos } from "@/lib/todos";

export async function GET(req: NextRequest) {
  return withUser(async (uid) => {
    const date = req.nextUrl.searchParams.get("date");
    if (!isKey(date)) throw new HttpError(400, "Add ?date=YYYY-MM-DD");
    const { habits, counts } = await loadHabits(uid, addDays(date, -400), date);
    const list = habits
      .map((h) => habitToday(h, counts.get(h._id) ?? new Map(), date))
      .filter((h) => h.scheduled)
      .sort(byTime);
    const [todos, moods, p] = await Promise.all([
      loadTodos(uid, date, date),
      Mood.find({ userId: uid, date }).lean() as unknown as Promise<{ date: string; level: number; time?: string }[]>,
      pointsFor(uid),
    ]);
    const mood = bestByDate(moods).get(date) ?? null;
    return ok({ date, habits: list, todos, mood, moodCount: moods.length, points: p.points });
  });
}
