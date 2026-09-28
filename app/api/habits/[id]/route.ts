import type { NextRequest } from "next/server";
import { Habit, HabitLog } from "@/models";
import { HttpError, isObjectId, ok, readBody, withUser } from "@/lib/server";
import { addDays, isKey } from "@/lib/dates";
import { parseHabitInput, serializeHabit } from "@/lib/habitsServer";
import { completionRate, streaks } from "@/lib/habitLogic";

type Ctx = { params: Promise<{ id: string }> };

async function findHabit(uid: string, id: string) {
  if (!isObjectId(id)) throw new HttpError(404, "Habit not found.");
  const h = await Habit.findOne({ _id: id, userId: uid }).lean();
  if (!h) throw new HttpError(404, "Habit not found.");
  return serializeHabit(h as Record<string, unknown>);
}

export async function GET(req: NextRequest, ctx: Ctx) {
  return withUser(async (uid) => {
    const { id } = await ctx.params;
    const today = req.nextUrl.searchParams.get("today");
    if (!isKey(today)) throw new HttpError(400, "Add ?today=YYYY-MM-DD");
    const habit = await findHabit(uid, id);
    const logs = (await HabitLog.find({ habitId: id, date: { $gte: addDays(today, -400), $lte: today } }).lean()) as unknown as {
      date: string; count: number;
    }[];
    const counts = new Map(logs.map((l) => [l.date, l.count]));
    const s = streaks(habit, counts, today);
    const totalDone = logs.filter((l) => l.count >= Math.max(1, habit.goal)).length;
    return ok({
      habit,
      counts: Object.fromEntries(counts),
      streak: s.current,
      best: s.best,
      streakUnit: s.unit,
      rate: completionRate(habit, counts, today, 30),
      totalDone,
    });
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  return withUser(async (uid) => {
    const { id } = await ctx.params;
    await findHabit(uid, id);
    const data = parseHabitInput(await readBody(req), true);
    const h = await Habit.findOneAndUpdate({ _id: id, userId: uid }, { $set: data }, { new: true }).lean();
    return ok(serializeHabit(h as Record<string, unknown>));
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return withUser(async (uid) => {
    const { id } = await ctx.params;
    await findHabit(uid, id);
    await Promise.all([Habit.deleteOne({ _id: id, userId: uid }), HabitLog.deleteMany({ habitId: id, userId: uid })]);
    return ok({ ok: true });
  });
}
