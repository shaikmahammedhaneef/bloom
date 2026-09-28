import { Mood } from "@/models";
import { EMOTIONS, TRIGGERS } from "./catalog";
import { isKey, isTime } from "./dates";
import { HttpError, str } from "./server";

type MoodLike = { date: string; level: number; time?: string };

// Older databases had one check-in per day, enforced by a unique index. Drop it
// once so several check-ins can be saved.
let checked = false;
export async function ensureMoodIndexes() {
  if (checked) return;
  try {
    const indexes = (await Mood.collection.indexes()) as { name?: string; unique?: boolean }[];
    const old = indexes.find((i) => i.name === "userId_1_date_1" && i.unique);
    if (old) await Mood.collection.dropIndex("userId_1_date_1");
    await Mood.syncIndexes();
  } catch (e) {
    const code = (e as { code?: number }).code;
    if (code !== 26) console.error("Mood index check failed", e); // 26: collection doesn't exist yet
  }
  checked = true;
}

/** The best check-in of each day. On ties, the latest one. */
export function bestByDate<T extends MoodLike>(moods: T[]): Map<string, T> {
  const best = new Map<string, T>();
  for (const m of moods) {
    const b = best.get(m.date);
    if (!b || m.level > b.level || (m.level === b.level && (m.time ?? "") > (b.time ?? ""))) best.set(m.date, m);
  }
  return best;
}

/** Validates a check-in from the client. `partial` keeps the date and time as they are. */
export function parseMood(b: Record<string, unknown>, partial = false) {
  const out: Record<string, unknown> = {};
  if (!partial) {
    if (!isKey(b.date)) throw new HttpError(400, "Send a date.");
    out.date = b.date;
    out.time = isTime(b.time) ? b.time : "";
  }
  const level = Number(b.level);
  if (!Number.isInteger(level) || level < 1 || level > 5) throw new HttpError(400, "Pick how you feel first.");
  out.level = level;
  out.emotions = Array.isArray(b.emotions) ? b.emotions.filter((e) => EMOTIONS.includes(String(e))) : [];
  out.triggers = Array.isArray(b.triggers) ? b.triggers.filter((t) => TRIGGERS.some((x) => x.key === t)) : [];
  out.note = str(b.note, 2000);
  return out;
}
