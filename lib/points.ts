import { Habit, HabitLog, Journal, Mood, Session, UserChallenge } from "@/models";
import { LEVEL_NAMES } from "./catalog";
import { loadHabits } from "./habitsServer";
import { streaks } from "./habitLogic";
import { addDays } from "./dates";
import type { Badge } from "./types";

export const POINTS = { habit: 10, mood: 5, journal: 15, session: 5, challenge: 200 };

export function levelInfo(points: number) {
  let level = 1;
  while (75 * (level + 1) * level <= points) level++;
  const name = (l: number) => LEVEL_NAMES[Math.min(l - 1, LEVEL_NAMES.length - 1)];
  return { level, name: name(level), start: 75 * level * (level - 1), next: 75 * (level + 1) * level, nextName: name(level + 1) };
}

export async function pointsFor(uid: string) {
  const habits = (await Habit.find({ userId: uid }).select("goal startTime category").lean()) as unknown as {
    _id: unknown; goal: number; startTime: string; category: string;
  }[];
  const byId = new Map(habits.map((h) => [String(h._id), h]));
  const logs = (await HabitLog.find({ userId: uid, count: { $gt: 0 } }).select("habitId count").lean()) as unknown as {
    habitId: unknown; count: number;
  }[];
  let habitsDone = 0;
  let early = 0;
  let goalHits = 0;
  const cats = new Set<string>();
  for (const l of logs) {
    const h = byId.get(String(l.habitId));
    if (!h || l.count < Math.max(1, h.goal)) continue;
    habitsDone++;
    cats.add(h.category);
    if (h.startTime && h.startTime < "08:00") early++;
    if (h.goal > 1) goalHits++;
  }
  const [moods, journals, sessions, breathe, focus, challenges] = await Promise.all([
    Mood.countDocuments({ userId: uid }),
    Journal.countDocuments({ userId: uid }),
    Session.countDocuments({ userId: uid }),
    Session.countDocuments({ userId: uid, type: "breathe" }),
    Session.countDocuments({ userId: uid, type: "focus" }),
    UserChallenge.countDocuments({ userId: uid, status: "completed" }),
  ]);
  const points =
    habitsDone * POINTS.habit + moods * POINTS.mood + journals * POINTS.journal + sessions * POINTS.session + challenges * POINTS.challenge;
  return { points, habitsDone, moods, journals, sessions, breathe, focus, challenges, early, goalHits, categories: cats.size };
}

export async function achievements(uid: string, today: string) {
  const p = await pointsFor(uid);
  const { habits, counts } = await loadHabits(uid, addDays(today, -400), today);
  let bestDayStreak = 0;
  for (const h of habits) {
    const s = streaks(h, counts.get(h._id) ?? new Map(), today);
    if (s.unit === "day") bestDayStreak = Math.max(bestDayStreak, s.best);
  }
  const b = (key: string, name: string, desc: string, icon: string, earned: boolean): Badge => ({ key, name, desc, icon, earned });
  const badges: Badge[] = [
    b("streak-7", "7-day streak", "Keep any habit going for 7 days", "flame", bestDayStreak >= 7),
    b("streak-30", "30-day streak", "Keep any habit going for 30 days", "flame", bestDayStreak >= 30),
    b("early-bird", "Early bird", "Finish 10 habits that start before 8:00", "sun", p.early >= 10),
    b("goal-getter", "Goal getter", "Hit a count goal, like 8 glasses, 7 times", "drop", p.goalHits >= 7),
    b("first-journal", "First journal", "Write your first journal entry", "pen", p.journals >= 1),
    b("mood-mapper", "Mood mapper", "Check in your mood 7 times", "smile", p.moods >= 7),
    b("century", "100 habits", "Complete 100 habits", "star", p.habitsDone >= 100),
    b("zen", "Zen master", "Finish 10 breathing sessions", "wind", p.breathe >= 10),
    b("deep-focus", "Deep focus", "Finish 10 focus sessions", "target", p.focus >= 10),
    b("all-rounder", "All-rounder", "Complete habits in 3 categories", "grid", p.categories >= 3),
    b("challenge-champ", "Challenge champ", "Finish a challenge", "trophy", p.challenges >= 1),
    b("level-5", "Blooming", "Reach level 5", "sparkle", levelInfo(p.points).level >= 5),
  ];
  return { p, badges };
}
