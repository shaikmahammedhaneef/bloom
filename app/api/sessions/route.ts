import { Session } from "@/models";
import { HttpError, num, ok, readBody, str, withUser } from "@/lib/server";
import { isKey } from "@/lib/dates";

export async function POST(req: Request) {
  return withUser(async (uid) => {
    const b = await readBody(req);
    if (!isKey(b.date)) throw new HttpError(400, "Send a date.");
    if (!["breathe", "focus", "workout"].includes(String(b.type))) throw new HttpError(400, "Unknown session type.");
    const s = await Session.create({ userId: uid, date: b.date, type: b.type, minutes: num(b.minutes, 0, 600, 0), label: str(b.label, 80) });
    return ok(s.toObject(), 201);
  });
}
