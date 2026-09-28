// Keeps the Health water count and any water habit (e.g. "Drink water", 8
// glasses) in step, so both screens always show the same number of glasses.
import { Habit, HabitLog, Health } from "@/models";

type HabitLike = { name?: string; icon?: string; unit?: string };

export function isWaterHabit(h: HabitLike): boolean {
  return /glass/i.test(h.unit ?? "") || (h.icon === "drop" && /water/i.test(h.name ?? ""));
}

/** After the Health water count changes, set the same count on water habits. */
export async function waterToHabits(uid: string, date: string, glasses: number) {
  const habits = (await Habit.find({ userId: uid }).select("name icon unit goal").lean()) as unknown as (HabitLike & { _id: unknown; goal: number })[];
  await Promise.all(
    habits.filter(isWaterHabit).map((h) =>
      HabitLog.updateOne({ habitId: h._id, date }, { $set: { userId: uid, count: Math.min(glasses, Math.max(1, h.goal) * 3) } }, { upsert: true }),
    ),
  );
}

/** After a water habit's count changes, set the same count on Health. */
export async function habitToWater(uid: string, date: string, glasses: number) {
  await Health.updateOne({ userId: uid, date }, { $set: { water: glasses } }, { upsert: true });
}
