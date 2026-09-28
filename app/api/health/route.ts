import type { NextRequest } from "next/server";
import { Health, Session, User } from "@/models";
import { HttpError, num, ok, readBody, withUser } from "@/lib/server";
import { addDays, duration, isKey, isTime } from "@/lib/dates";
import type { HealthDay } from "@/lib/types";

const blank = (date: string): HealthDay => ({ date, water: 0, steps: 0, weight: null, sleepStart: "", sleepEnd: "" });

export async function GET(req: NextRequest) {
  return withUser(async (uid) => {
    const date = req.nextUrl.searchParams.get("date");
    if (!isKey(date)) throw new HttpError(400, "Add ?date=YYYY-MM-DD");
    const from = addDays(date, -29);
    const docs = (await Health.find({ userId: uid, date: { $gte: from, $lte: date } }).lean()) as unknown as HealthDay[];
    const byDate = new Map(docs.map((d) => [d.date, d]));
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const k = addDays(date, -i);
      const d = byDate.get(k);
      week.push({ date: k, sleepMin: d ? duration(d.sleepStart, d.sleepEnd) : null, steps: d?.steps ?? 0 });
    }
    const weights = docs.filter((d) => typeof d.weight === "number").sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ date: d.date, weight: d.weight as number }));
    const user = (await User.findById(uid).select("settings").lean()) as unknown as { settings?: { waterGoal?: number; stepGoal?: number } } | null;
    const sessions = await Session.find({ userId: uid, date }).lean();
    const today = byDate.get(date);
    return ok({
      today: today ? { ...blank(date), ...today } : blank(date),
      week,
      weights,
      goals: { water: user?.settings?.waterGoal ?? 8, steps: user?.settings?.stepGoal ?? 8000 },
      sessions,
    });
  });
}

export async function POST(req: Request) {
  return withUser(async (uid) => {
    const b = await readBody(req);
    if (!isKey(b.date)) throw new HttpError(400, "Send a date.");
    const set: Record<string, unknown> = {};
    if ("water" in b) set.water = num(b.water, 0, 40, 0);
    if ("steps" in b) set.steps = num(b.steps, 0, 200000, 0);
    if ("weight" in b) {
      if (b.weight === null || b.weight === "") set.weight = null;
      else {
        const w = Number(b.weight);
        if (!Number.isFinite(w) || w < 20 || w > 400) throw new HttpError(400, "Enter a weight between 20 and 400 kg.");
        set.weight = Math.round(w * 10) / 10;
      }
    }
    for (const k of ["sleepStart", "sleepEnd"] as const) {
      if (k in b) {
        if (b[k] && !isTime(b[k])) throw new HttpError(400, "Sleep times must look like 23:00.");
        set[k] = b[k] || "";
      }
    }
    const doc = await Health.findOneAndUpdate({ userId: uid, date: b.date }, { $set: set }, { upsert: true, new: true }).lean();
    return ok(doc);
  });
}
