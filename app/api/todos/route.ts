import type { NextRequest } from "next/server";
import { Todo } from "@/models";
import { HttpError, ok, readBody, withUser } from "@/lib/server";
import { isKey } from "@/lib/dates";
import { parseTodo } from "@/lib/todos";

export async function GET(req: NextRequest) {
  return withUser(async (uid) => {
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to") ?? from;
    if (!isKey(from) || !isKey(to)) throw new HttpError(400, "Add ?from=YYYY-MM-DD");
    const todos = await Todo.find({ userId: uid, date: { $gte: from, $lte: to } }).sort({ date: 1, startTime: 1 }).lean();
    return ok(todos);
  });
}

export async function POST(req: Request) {
  return withUser(async (uid) => {
    const data = parseTodo(await readBody(req));
    const t = await Todo.create({ ...data, userId: uid });
    return ok(t.toObject(), 201);
  });
}
