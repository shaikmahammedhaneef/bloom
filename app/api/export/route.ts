import type { NextRequest } from "next/server";
import { Habit, HabitLog, Health, Journal, Mood, Session, Todo } from "@/models";
import { csvEscape, HttpError, withUser } from "@/lib/server";

type Row = Record<string, unknown>;

function toCsv(headers: string[], rows: Row[]) {
  return [headers.join(","), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","))].join("\n");
}

export async function GET(req: NextRequest) {
  return withUser(async (uid) => {
    const kind = req.nextUrl.searchParams.get("kind") ?? "habits";
    let csv: string;
    if (kind === "habits") {
      const habits = (await Habit.find({ userId: uid }).lean()) as unknown as Row[];
      const byId = new Map(habits.map((h) => [String(h._id), h]));
      const logs = (await HabitLog.find({ userId: uid }).sort({ date: 1 }).lean()) as unknown as Row[];
      csv = toCsv(
        ["date", "habit", "from", "to", "count", "goal", "done"],
        logs.map((l) => {
          const h = byId.get(String(l.habitId)) ?? {};
          const goal = Math.max(1, Number(h.goal ?? 1));
          return { date: l.date, habit: h.name, from: h.startTime, to: h.endTime, count: l.count, goal, done: Number(l.count) >= goal ? "yes" : "no" };
        })
      );
    } else if (kind === "moods") {
      csv = toCsv(["date", "time", "level", "emotions", "triggers", "note"], (await Mood.find({ userId: uid }).sort({ date: 1, time: 1 }).lean()) as unknown as Row[]);
    } else if (kind === "journal") {
      csv = toCsv(["date", "prompt", "text", "gratitude"], (await Journal.find({ userId: uid }).sort({ date: 1 }).lean()) as unknown as Row[]);
    } else if (kind === "todos") {
      csv = toCsv(["date", "startTime", "endTime", "title", "done", "repeat"], (await Todo.find({ userId: uid }).sort({ date: 1 }).lean()) as unknown as Row[]);
    } else if (kind === "health") {
      csv = toCsv(["date", "water", "steps", "weight", "sleepStart", "sleepEnd"], (await Health.find({ userId: uid }).sort({ date: 1 }).lean()) as unknown as Row[]);
    } else if (kind === "sessions") {
      csv = toCsv(["date", "type", "minutes", "label"], (await Session.find({ userId: uid }).sort({ date: 1 }).lean()) as unknown as Row[]);
    } else {
      throw new HttpError(400, "Unknown export type.");
    }
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bloom-${kind}.csv"`,
      },
    });
  });
}
