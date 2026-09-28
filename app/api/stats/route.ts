import type { NextRequest } from "next/server";
import { Health, Mood } from "@/models";
import { HttpError, ok, withUser } from "@/lib/server";
import { addDays, duration, isKey, parseKey, partOfDay, toKey } from "@/lib/dates";
import { loadHabits } from "@/lib/habitsServer";
import { doneOn, isScheduled } from "@/lib/habitLogic";
import { achievements, levelInfo, POINTS } from "@/lib/points";
import { MOOD_NAMES } from "@/lib/catalog";

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export async function GET(req: NextRequest) {
  return withUser(async (uid) => {
    const q = req.nextUrl.searchParams;
    const today = q.get("today");
    const range = q.get("range") === "month" ? "month" : "week";
    if (!isKey(today)) throw new HttpError(400, "Add ?today=YYYY-MM-DD");

    let from: string;
    let to: string;
    if (range === "week") {
      from = addDays(today, -6);
      to = today;
    } else {
      const d = parseKey(today);
      from = toKey(new Date(d.getFullYear(), d.getMonth(), 1));
      to = toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    }

    // Habits over the last 90 days (for insights) and the chosen range.
    const since = from < addDays(today, -89) ? from : addDays(today, -89);
    const { habits, counts } = await loadHabits(uid, since, today);
    const moods = (await Mood.find({ userId: uid, date: { $gte: since, $lte: today } }).lean()) as unknown as { date: string; level: number }[];
    const moodBy = new Map(moods.map((m) => [m.date, m.level]));

    const days: { date: string; pct: number | null }[] = [];
    let habitsDone = 0;
    const partTotals: Record<string, { s: number; d: number }> = {};
    for (let k = from; k <= to; k = addDays(k, 1)) {
      if (k > today) {
        days.push({ date: k, pct: null });
        continue;
      }
      let s = 0;
      let d = 0;
      for (const h of habits) {
        if (!isScheduled(h, k)) continue;
        const c = counts.get(h._id) ?? new Map();
        const done = doneOn(h, c, k);
        if (h.repeat === "weekly" && !done) continue;
        s++;
        if (done) d++;
        const part = partOfDay(h.startTime);
        partTotals[part] ??= { s: 0, d: 0 };
        partTotals[part].s++;
        if (done) partTotals[part].d++;
      }
      habitsDone += d;
      days.push({ date: k, pct: s ? Math.round((d / s) * 100) : null });
    }
    const pcts = days.map((d) => d.pct).filter((x): x is number => x !== null);
    const rangeMoods = moods.filter((m) => m.date >= from && m.date <= to).sort((a, b) => a.date.localeCompare(b.date));

    // Insights: which habits line up with better moods.
    const insights: { text: string; score: number }[] = [];
    for (const h of habits) {
      const c = counts.get(h._id) ?? new Map();
      const yes: number[] = [];
      const no: number[] = [];
      for (const [date, level] of moodBy) {
        if (!isScheduled(h, date)) continue;
        (doneOn(h, c, date) ? yes : no).push(level);
      }
      const a = avg(yes);
      const b = avg(no);
      if (yes.length >= 3 && no.length >= 3 && a !== null && b !== null && a - b >= 0.5) {
        insights.push({
          text: `On days you complete “${h.name}”, your mood is usually ${MOOD_NAMES[Math.round(a) - 1].toLowerCase()} instead of ${MOOD_NAMES[Math.round(b) - 1].toLowerCase()}.`,
          score: a - b,
        });
      }
    }
    const health = (await Health.find({ userId: uid, date: { $gte: since, $lte: today } }).lean()) as unknown as {
      date: string; sleepStart: string; sleepEnd: string;
    }[];
    const good: number[] = [];
    const short: number[] = [];
    for (const d of health) {
      const min = duration(d.sleepStart, d.sleepEnd);
      const m = moodBy.get(d.date);
      if (min === null || m === undefined) continue;
      (min >= 420 ? good : short).push(m);
    }
    const g = avg(good);
    const s = avg(short);
    if (good.length >= 3 && short.length >= 3 && g !== null && s !== null && g - s >= 0.4) {
      insights.push({ text: "After 7 hours of sleep or more, your mood tends to be better.", score: g - s });
    }
    const parts = Object.entries(partTotals).filter(([, v]) => v.s >= 5);
    if (parts.length >= 2) {
      parts.sort((a, b) => b[1].d / b[1].s - a[1].d / a[1].s);
      const [best, v] = parts[0];
      insights.push({ text: `You finish most of your ${best} habits — ${Math.round((v.d / v.s) * 100)}% of them.`, score: 0.1 });
    }
    insights.sort((a, b) => b.score - a.score);

    const { p, badges } = await achievements(uid, today);
    const lv = levelInfo(p.points);
    return ok({
      range, from, to, days,
      avgCompletion: pcts.length ? Math.round(avg(pcts)!) : null,
      habitsDone,
      avgMood: rangeMoods.length ? Math.round(avg(rangeMoods.map((m) => m.level))! * 10) / 10 : null,
      moodSeries: rangeMoods.map((m) => ({ date: m.date, level: m.level })),
      insights: insights.slice(0, 3).map((i) => i.text),
      points: p.points, level: lv.level, levelName: lv.name, levelStart: lv.start, levelNext: lv.next, nextName: lv.nextName,
      badges,
      breakdown: [
        { label: "Habits completed", count: p.habitsDone, each: POINTS.habit },
        { label: "Mood check-ins", count: p.moods, each: POINTS.mood },
        { label: "Journal entries", count: p.journals, each: POINTS.journal },
        { label: "Breathing, focus and workouts", count: p.sessions, each: POINTS.session },
        { label: "Challenges finished", count: p.challenges, each: POINTS.challenge },
      ],
    });
  });
}
