import type { NextRequest } from "next/server";
import { UserChallenge } from "@/models";
import { HttpError, ok, readBody, withUser } from "@/lib/server";
import { daysBetween, isKey } from "@/lib/dates";
import { CHALLENGES } from "@/lib/catalog";
import { view, type ChallengeDoc as Doc } from "@/lib/challenges";

export async function GET(req: NextRequest) {
  return withUser(async (uid) => {
    const today = req.nextUrl.searchParams.get("today");
    if (!isKey(today)) throw new HttpError(400, "Add ?today=YYYY-MM-DD");
    const docs = (await UserChallenge.find({ userId: uid, status: { $ne: "left" } }).sort({ createdAt: -1 }).lean()) as unknown as Doc[];
    // End challenges whose time ran out.
    for (const d of docs) {
      const def = CHALLENGES.find((c) => c.key === d.key);
      if (d.status === "active" && def && daysBetween(d.startDate, today) >= def.days) {
        d.status = d.doneDates.length >= def.days ? "completed" : "ended";
        await UserChallenge.updateOne({ _id: d._id }, { $set: { status: d.status } });
      }
    }
    const mine = docs.map((d) => view(d, today)).filter(Boolean);
    return ok({ catalog: CHALLENGES, mine });
  });
}

export async function POST(req: Request) {
  return withUser(async (uid) => {
    const b = await readBody(req);
    if (!isKey(b.today)) throw new HttpError(400, "Send today's date.");
    if (!CHALLENGES.some((c) => c.key === b.key)) throw new HttpError(404, "That challenge doesn't exist.");
    if (await UserChallenge.exists({ userId: uid, key: b.key, status: "active" })) {
      throw new HttpError(409, "You're already doing this challenge.");
    }
    const d = await UserChallenge.create({ userId: uid, key: b.key, startDate: b.today });
    return ok(view(d.toObject() as Doc, b.today), 201);
  });
}
