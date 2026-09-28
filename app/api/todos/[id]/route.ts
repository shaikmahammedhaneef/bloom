import { Todo } from "@/models";
import { HttpError, isObjectId, ok, readBody, withUser } from "@/lib/server";
import { parseTodo } from "@/lib/todos";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  return withUser(async (uid) => {
    const { id } = await ctx.params;
    if (!isObjectId(id)) throw new HttpError(404, "To-do not found.");
    const data = parseTodo(await readBody(req), true);
    const t = await Todo.findOneAndUpdate({ _id: id, userId: uid }, { $set: data }, { new: true }).lean();
    if (!t) throw new HttpError(404, "To-do not found.");
    return ok(t);
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return withUser(async (uid) => {
    const { id } = await ctx.params;
    if (!isObjectId(id)) throw new HttpError(404, "To-do not found.");
    await Todo.deleteOne({ _id: id, userId: uid });
    return ok({ ok: true });
  });
}
