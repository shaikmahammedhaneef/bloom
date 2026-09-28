// Date helpers. Days are stored as local "YYYY-MM-DD" keys and times as "HH:mm".

export function toKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k: string, n: number): string {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** 0 = Sunday … 6 = Saturday */
export function dow(k: string): number {
  return parseKey(k).getDay();
}

export function isKey(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function isTime(s: unknown): s is string {
  return typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

export function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function nowTime(d: Date = new Date()): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Minutes between two times; wraps past midnight (23:00 → 07:00 = 8h). */
export function duration(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  let d = toMin(end) - toMin(start);
  if (d <= 0) d += 1440;
  return d;
}

export function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function timeRange(start?: string | null, end?: string | null): string {
  if (!start) return "";
  return end ? `${start} – ${end}` : start;
}

export type Part = "morning" | "afternoon" | "evening" | "anytime";

export function partOfDay(start?: string | null): Part {
  if (!start) return "anytime";
  const m = toMin(start);
  if (m < 12 * 60) return "morning";
  if (m < 17 * 60) return "afternoon";
  return "evening";
}

/** Monday of the week containing k */
export function weekStart(k: string): string {
  return addDays(k, -((dow(k) + 6) % 7));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86400000);
}

export function fmtLong(k: string): string {
  return parseKey(k).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export function fmtShort(k: string): string {
  return parseKey(k).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function fmtDay(k: string): string {
  return parseKey(k).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
