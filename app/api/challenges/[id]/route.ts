import { UserChallenge } from "@/models";
import { HttpError, isObjectId, ok, readBody, withUser } from "@/lib/server";
import { isKey } from "@/lib/dates";
import { CHALLENGES } from "@/lib/catalog";
import { view, type ChallengeDoc } from "@/lib/challenges";

type Ctx = { params: Promise<{ id: string }> };

/** Body: { date, done } marks a day of the challenge done or not done. */
export async function PATCH(req: Request, ctx: Ctx) {
  return withUser(async (uid) => {
    const { id } = await ctx.params;
    if (!isObjectId(id)) throw new HttpError(404, "Challenge not found.");
    const b = await readBody(req);
    if (!isKey(b.date)) throw new HttpError(400, "Send a date.");
    const d = (await UserChallenge.findOne({ _id: id, userId: uid }).lean()) as unknown as ChallengeDoc | null;
    if (!d) throw new HttpError(404, "Challenge not found.");
    if (d.status !== "active") throw new HttpError(400, "This challenge has ended.");
    if (b.date < d.startDate) throw new HttpError(400, "That day is before the challenge started.");
    const set = new Set(d.doneDates);
    if (b.done) set.add(b.date);
    else set.delete(b.date);
    const doneDates = [...set].sort();
    const def = CHALLENGES.find((c) => c.key === d.key)!;
    const status = doneDates.length >= def.days ? "completed" : "active";
    await UserChallenge.updateOne({ _id: id }, { $set: { doneDates, status } });
    return ok(view({ ...d, doneDates, status }, b.date));
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return withUser(async (uid) => {
    const { id } = await ctx.params;
    if (!isObjectId(id)) throw new HttpError(404, "Challenge not found.");
    await UserChallenge.updateOne({ _id: id, userId: uid }, { $set: { status: "left" } });
    return ok({ ok: true });
  });
}
