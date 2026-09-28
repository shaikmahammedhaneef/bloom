import type { NextRequest } from "next/server";
import { Journal, Mood } from "@/models";
import { HttpError, ok, readBody, str, withUser } from "@/lib/server";
import { isKey } from "@/lib/dates";
import { bestByDate } from "@/lib/moods";

export async function GET(req: NextRequest) {
  return withUser(async (uid) => {
    const date = req.nextUrl.searchParams.get("date");
    if (isKey(date)) return ok(await Journal.findOne({ userId: uid, date }).lean());
    const entries = (await Journal.find({ userId: uid }).sort({ date: -1 }).limit(30).lean()) as unknown as { date: string }[];
    const moods = (await Mood.find({ userId: uid, date: { $in: entries.map((e) => e.date) } }).select("date level").lean()) as unknown as {
      date: string; level: number;
    }[];
    const best = bestByDate(moods);
    return ok(entries.map((e) => ({ ...e, mood: best.get(e.date)?.level ?? null })));
  });
}

export async function POST(req: Request) {
  return withUser(async (uid) => {
    const b = await readBody(req);
    if (!isKey(b.date)) throw new HttpError(400, "Send a date.");
    const gratitude = Array.isArray(b.gratitude) ? b.gratitude.map((g) => str(g, 200)).slice(0, 3) : [];
    const text = str(b.text, 10000);
    if (!text && !gratitude.some(Boolean)) throw new HttpError(400, "Write something before saving.");
    const entry = await Journal.findOneAndUpdate(
      { userId: uid, date: b.date },
      { $set: { prompt: str(b.prompt, 300), text, gratitude } },
      { upsert: true, new: true }
    ).lean();
    return ok(entry);
  });
}
