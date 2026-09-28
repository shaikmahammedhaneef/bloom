import { HttpError, str } from "./server";
import { isKey, isTime } from "./dates";

export function parseTodo(b: Record<string, unknown>, partial = false) {
  const out: Record<string, unknown> = {};
  if (!partial || "title" in b) {
    const t = str(b.title, 140);
    if (!t) throw new HttpError(400, "Write what you need to do.");
    out.title = t;
  }
  if (!partial || "date" in b) {
    if (!isKey(b.date)) throw new HttpError(400, "Pick a date.");
    out.date = b.date;
  }
  if ("startTime" in b || "endTime" in b) {
    const s = b.startTime || "";
    const e = b.endTime || "";
    if (s && !isTime(s)) throw new HttpError(400, "The 'from' time must look like 10:00.");
    if (e && !isTime(e)) throw new HttpError(400, "The 'to' time must look like 10:30.");
    if (e && !s) throw new HttpError(400, "Add a 'from' time before the 'to' time.");
    out.startTime = s;
    out.endTime = e;
  }
  if ("done" in b) out.done = Boolean(b.done);
  if ("reminder" in b) out.reminder = Boolean(b.reminder);
  return out;
}

