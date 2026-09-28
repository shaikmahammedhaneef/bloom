import { Habit } from "@/models";
import { HttpError, ok, readBody, withUser } from "@/lib/server";
import { addDays, isKey, toKey } from "@/lib/dates";
import { byTime, habitToday, loadHabits, parseHabitInput, serializeHabit } from "@/lib/habitsServer";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withUser(async (uid) => {
    const today = req.nextUrl.searchParams.get("today");
    if (!isKey(today)) throw new HttpError(400, "Add ?today=YYYY-MM-DD");
    const { habits, counts } = await loadHabits(uid, addDays(today, -400), today);
    const list = habits.map((h) => habitToday(h, counts.get(h._id) ?? new Map(), today)).sort(byTime);
    return ok(list);
  });
}

export async function POST(req: Request) {
  return withUser(async (uid) => {
    const b = await readBody(req);
    const data = parseHabitInput(b);
    if (!data.startDate) data.startDate = toKey();
    const doc = await Habit.create({ ...data, userId: uid });
    return ok(serializeHabit(doc.toObject()), 201);
  });
}
