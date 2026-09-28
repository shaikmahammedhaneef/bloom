import type { NextRequest } from "next/server";
import { Mood } from "@/models";
import { HttpError, ok, readBody, withUser } from "@/lib/server";
import { isKey } from "@/lib/dates";
import { ensureMoodIndexes, parseMood } from "@/lib/moods";

// ?date=YYYY-MM-DD lists that day's check-ins; ?month=YYYY-MM lists the month's.
export async function GET(req: NextRequest) {
  return withUser(async (uid) => {
    const q = req.nextUrl.searchParams;
    const date = q.get("date");
    const month = q.get("month");
    if (isKey(date)) return ok(await Mood.find({ userId: uid, date }).sort({ time: 1, createdAt: 1 }).lean());
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      return ok(await Mood.find({ userId: uid, date: { $gte: `${month}-01`, $lte: `${month}-31` } }).sort({ date: 1, time: 1 }).lean());
    }
    throw new HttpError(400, "Add ?date=YYYY-MM-DD or ?month=YYYY-MM");
  });
}

// Adds a new check-in. There can be several per day.
export async function POST(req: Request) {
  return withUser(async (uid) => {
    await ensureMoodIndexes();
    const data = parseMood(await readBody(req));
    const mood = await Mood.create({ ...data, userId: uid });
    return ok(mood.toObject(), 201);
  });
}
