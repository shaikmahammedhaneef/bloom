import { Habit } from "@/models";
import { TEMPLATES } from "@/lib/catalog";
import { HttpError } from "@/lib/server";

/** Creates a template's habits for the user, skipping names they already have. Returns how many were added. */
export async function applyTemplate(uid: string, key: string, today: string): Promise<number> {
  const t = TEMPLATES.find((x) => x.key === key);
  if (!t) throw new HttpError(404, "That template doesn't exist.");
  const existing = new Set(
    ((await Habit.find({ userId: uid }).select("name").lean()) as unknown as { name: string }[]).map((h) => h.name.toLowerCase())
  );
  const docs = t.habits
    .filter((h) => !existing.has(h.name.toLowerCase()))
    .map((h) => ({
      userId: uid,
      ...h,
      timesPerWeek: h.timesPerWeek ?? 3,
      days: h.days ?? [],
      goal: h.goal ?? 1,
      unit: h.unit ?? "",
      reminder: true,
      startDate: today,
    }));
  if (docs.length) await Habit.insertMany(docs);
  return docs.length;
}
