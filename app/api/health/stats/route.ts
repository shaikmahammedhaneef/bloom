import type { NextRequest } from "next/server";
import { Health, User } from "@/models";
import { HttpError, ok, withUser } from "@/lib/server";
import { addDays, duration, isKey } from "@/lib/dates";

const RANGES = [7, 30, 90, 365];

// Every day from `to` minus `days - 1` up to `to`, with whatever was logged.
// Sleep is stored on the day you woke up.
export async function GET(req: NextRequest) {
  return withUser(async (uid) => {
    const q = req.nextUrl.searchParams;
    const to = q.get("to");
    const days = Number(q.get("days"));
    if (!isKey(to) || !RANGES.includes(days)) throw new HttpError(400, "Add ?to=YYYY-MM-DD&days=7|30|90|365");
    const from = addDays(to, -(days - 1));
    const docs = (await Health.find({ userId: uid, date: { $gte: from, $lte: to } }).lean()) as unknown as {
      date: string; water?: number; steps?: number; weight?: number | null; sleepStart?: string; sleepEnd?: string;
    }[];
    const byDate = new Map(docs.map((d) => [d.date, d]));
    const rows = [];
    for (let k = from; k <= to; k = addDays(k, 1)) {
      const d = byDate.get(k);
      rows.push({
        date: k,
        sleepMin: d ? duration(d.sleepStart, d.sleepEnd) : null,
        sleepStart: d?.sleepStart ?? "",
        sleepEnd: d?.sleepEnd ?? "",
        water: d?.water ?? 0,
        steps: d?.steps ?? 0,
        weight: typeof d?.weight === "number" ? d.weight : null,
      });
    }
    // The last weight before the range, so the change can be shown from day one.
    const before = (await Health.findOne({ userId: uid, date: { $lt: from }, weight: { $ne: null } }).sort({ date: -1 }).select("date weight").lean()) as unknown as { date: string; weight: number } | null;
    const user = (await User.findById(uid).select("settings").lean()) as unknown as { settings?: { waterGoal?: number; stepGoal?: number } } | null;
    return ok({
      from, to, rows,
      weightBefore: before?.weight ?? null,
      goals: { water: user?.settings?.waterGoal ?? 8, steps: user?.settings?.stepGoal ?? 8000, sleepMin: 7 * 60 },
    });
  });
}
