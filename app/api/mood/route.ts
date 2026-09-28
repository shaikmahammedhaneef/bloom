import type { NextRequest } from "next/server";
import { Mood } from "@/models";
import { HttpError, ok, readBody, str, withUser } from "@/lib/server";
import { isKey } from "@/lib/dates";
import { EMOTIONS, TRIGGERS } from "@/lib/catalog";

export async function GET(req: NextRequest) {
  return withUser(async (uid) => {
    const q = req.nextUrl.searchParams;
    const date = q.get("date");
    const month = q.get("month");
    if (isKey(date)) return ok(await Mood.findOne({ userId: uid, date }).lean());
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      return ok(await Mood.find({ userId: uid, date: { $gte: `${month}-01`, $lte: `${month}-31` } }).sort({ date: 1 }).lean());
    }
    throw new HttpError(400, "Add ?date=YYYY-MM-DD or ?month=YYYY-MM");
  });
}

export async function POST(req: Request) {
  return withUser(async (uid) => {
    const b = await readBody(req);
    if (!isKey(b.date)) throw new HttpError(400, "Send a date.");
    const level = Number(b.level);
    if (!Number.isInteger(level) || level < 1 || level > 5) throw new HttpError(400, "Pick how you feel first.");
    const emotions = Array.isArray(b.emotions) ? b.emotions.filter((e) => EMOTIONS.includes(String(e))) : [];
    const triggers = Array.isArray(b.triggers) ? b.triggers.filter((t) => TRIGGERS.some((x) => x.key === t)) : [];
    const mood = await Mood.findOneAndUpdate(
      { userId: uid, date: b.date },
      { $set: { level, emotions, triggers, note: str(b.note, 2000) } },
      { upsert: true, new: true }
    ).lean();
    return ok(mood);
  });
}
