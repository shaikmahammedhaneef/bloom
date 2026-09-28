import type { NextRequest } from "next/server";
import { Todo } from "@/models";
import { HttpError, isObjectId, ok, readBody, withUser } from "@/lib/server";
import { isKey } from "@/lib/dates";
import { occurrence, parseTodo, repeats, type TodoDoc } from "@/lib/todos";

type Ctx = { params: Promise<{ id: string }> };

function checkRange(start: unknown, end: unknown) {
  if (typeof start === "string" && typeof end === "string" && end && end < start) {
    throw new HttpError(400, "The end date can't be before the start date.");
  }
}

async function find(uid: string, id: string): Promise<TodoDoc> {
  if (!isObjectId(id)) throw new HttpError(404, "To-do not found.");
  const t = (await Todo.findOne({ _id: id, userId: uid }).lean()) as unknown as TodoDoc | null;
  if (!t) throw new HttpError(404, "To-do not found.");
  return t;
}

// For a repeating to-do, `on` is the day being changed and `scope` is "one"
// (only that day) or "all" (every day it's scheduled).
export async function PATCH(req: Request, ctx: Ctx) {
  return withUser(async (uid) => {
    const { id } = await ctx.params;
    const body = await readBody(req);
    const t = await find(uid, id);
    const on = body.on;
    delete body.on;
    const scope = body.scope === "one" ? "one" : "all";
    delete body.scope;

    if (!repeats(t)) {
      const data = parseTodo(body, true);
      checkRange(data.date ?? t.date, data.endDate ?? t.endDate);
      if (data.repeat === "none") delete data.days;
      const next = await Todo.findOneAndUpdate({ _id: id, userId: uid }, { $set: data }, { new: true }).lean();
      return ok(occurrence(next as unknown as TodoDoc, (next as unknown as TodoDoc).date));
    }

    if (!isKey(on)) throw new HttpError(400, "Say which day with 'on'.");
    const keys = Object.keys(body);
    // Ticking a repeating to-do off only affects that day.
    if (keys.length === 1 && keys[0] === "done") {
      const op = body.done ? { $addToSet: { doneDates: on } } : { $pull: { doneDates: on } };
      const next = await Todo.findOneAndUpdate({ _id: id, userId: uid }, op, { new: true }).lean();
      return ok(occurrence(next as unknown as TodoDoc, on));
    }

    if (scope === "one") {
      // Split this day off as its own one-off to-do.
      const data = parseTodo({ title: t.title, startTime: t.startTime, endTime: t.endTime, reminder: t.reminder, ...body, date: on }, false);
      const copy = await Todo.create({ ...data, endDate: "", repeat: "none", days: [], done: Boolean(t.doneDates?.includes(on)), userId: uid });
      await Todo.updateOne({ _id: id, userId: uid }, { $addToSet: { skipDates: on } });
      return ok(occurrence(copy.toObject() as TodoDoc, on));
    }

    const data = parseTodo(body, true);
    delete data.date;
    // Turning off repeat keeps just the day being edited.
    if (data.repeat === "none") Object.assign(data, { date: on, done: Boolean(t.doneDates?.includes(on)), doneDates: [], skipDates: [] });
    checkRange(data.date ?? t.date, data.endDate ?? t.endDate);
    const next = await Todo.findOneAndUpdate({ _id: id, userId: uid }, { $set: data }, { new: true }).lean();
    return ok(occurrence(next as unknown as TodoDoc, on));
  });
}

// ?scope=one&on=YYYY-MM-DD removes a single day of a repeating to-do.
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return withUser(async (uid) => {
    const { id } = await ctx.params;
    const t = await find(uid, id);
    const scope = req.nextUrl.searchParams.get("scope");
    const on = req.nextUrl.searchParams.get("on");
    if (repeats(t) && scope === "one") {
      if (!isKey(on)) throw new HttpError(400, "Say which day with 'on'.");
      await Todo.updateOne({ _id: id, userId: uid }, { $addToSet: { skipDates: on }, $pull: { doneDates: on } });
    } else {
      await Todo.deleteOne({ _id: id, userId: uid });
    }
    return ok({ ok: true });
  });
}
