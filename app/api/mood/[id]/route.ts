import { Mood } from "@/models";
import { HttpError, isObjectId, ok, readBody, withUser } from "@/lib/server";
import { parseMood } from "@/lib/moods";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  return withUser(async (uid) => {
    const { id } = await ctx.params;
    if (!isObjectId(id)) throw new HttpError(404, "Check-in not found.");
    const data = parseMood(await readBody(req), true);
    const m = await Mood.findOneAndUpdate({ _id: id, userId: uid }, { $set: data }, { new: true }).lean();
    if (!m) throw new HttpError(404, "Check-in not found.");
    return ok(m);
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return withUser(async (uid) => {
    const { id } = await ctx.params;
    if (!isObjectId(id)) throw new HttpError(404, "Check-in not found.");
    await Mood.deleteOne({ _id: id, userId: uid });
    return ok({ ok: true });
  });
}
