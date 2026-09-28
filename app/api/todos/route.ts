import type { NextRequest } from "next/server";
import { Todo } from "@/models";
import { HttpError, ok, readBody, withUser } from "@/lib/server";
import { addDays, isKey } from "@/lib/dates";
import { loadTodos, occurrence, parseTodo, type TodoDoc } from "@/lib/todos";

export async function GET(req: NextRequest) {
  return withUser(async (uid) => {
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to") ?? from;
    if (!isKey(from) || !isKey(to)) throw new HttpError(400, "Add ?from=YYYY-MM-DD");
    if (to < from || to > addDays(from, 366)) throw new HttpError(400, "Pick a range of a year or less.");
    return ok(await loadTodos(uid, from, to));
  });
}

export async function POST(req: Request) {
  return withUser(async (uid) => {
    const data = parseTodo(await readBody(req));
    const t = await Todo.create({ ...data, userId: uid });
    return ok(occurrence(t.toObject() as TodoDoc, data.date as string), 201);
  });
}
