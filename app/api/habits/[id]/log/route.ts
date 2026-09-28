import { Habit, HabitLog } from "@/models";
import { HttpError, isObjectId, num, ok, readBody, withUser } from "@/lib/server";
import { isKey } from "@/lib/dates";

type Ctx = { params: Promise<{ id: string }> };

/** Body: { date, count } to set the count, or { date, delta } to add/subtract. */
export async function POST(req: Request, ctx: Ctx) {
  return withUser(async (uid) => {
    const { id } = await ctx.params;
    if (!isObjectId(id)) throw new HttpError(404, "Habit not found.");
    const b = await readBody(req);
    if (!isKey(b.date)) throw new HttpError(400, "Send a date like 2026-09-28.");
    const habit = (await Habit.findOne({ _id: id, userId: uid }).select("goal").lean()) as unknown as { goal: number } | null;
    if (!habit) throw new HttpError(404, "Habit not found.");
    const max = Math.max(1, habit.goal) * 3;
    let count: number;
    if ("delta" in b) {
      const cur = (await HabitLog.findOne({ habitId: id, date: b.date }).lean()) as unknown as { count: number } | null;
      count = Math.min(max, Math.max(0, (cur?.count ?? 0) + num(b.delta, -100, 100, 0)));
    } else {
      count = num(b.count, 0, max, 0);
    }
    await HabitLog.updateOne(
      { habitId: id, date: b.date },
      { $set: { count, userId: uid } },
      { upsert: true }
    );
    return ok({ count, done: count >= Math.max(1, habit.goal) });
  });
}
