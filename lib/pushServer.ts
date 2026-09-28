// Web Push: sends reminders to subscribed browsers while Bloom is closed.
// Something must call sendDueReminders() about once a minute — the
// /api/cron/reminders endpoint, or the built-in worker (REMINDER_WORKER=1).
import webpush from "web-push";
import { Habit, HabitLog, Mood, PushSub, ReminderSent, User } from "@/models";
import { addDays } from "./dates";
import { isScheduled } from "./habitLogic";
import { byTime, habitToday, loadHabits, serializeHabit } from "./habitsServer";
import { habitReminder, moodReminder, STREAK_TIME, streakReminder, todoReminder, type ReminderMsg } from "./reminderText";
import { loadTodos } from "./todos";

export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || "";
export const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let vapidSet = false;
function setupVapid() {
  if (vapidSet) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:bloom@example.com", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  vapidSet = true;
}

export function validTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The user's local day ("YYYY-MM-DD") and time ("HH:mm") at `at`. */
export function localSlot(tz: string, at: Date): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

type Due = ReminderMsg & { key: string };

async function dueAt(uid: string, r: { routine: boolean; mood: boolean; moodTime: string; streak: boolean }, date: string, time: string): Promise<Due[]> {
  const out: Due[] = [];
  if (r.routine) {
    const habits = ((await Habit.find({ userId: uid, reminder: true, startTime: time }).lean()) as Record<string, unknown>[])
      .map(serializeHabit)
      .filter((h) => isScheduled(h, date));
    if (habits.length) {
      const logs = (await HabitLog.find({ userId: uid, date, habitId: { $in: habits.map((h) => h._id) } }).lean()) as unknown as { habitId: unknown; count: number }[];
      const counts = new Map(logs.map((l) => [String(l.habitId), l.count]));
      for (const h of habits) {
        if ((counts.get(h._id) ?? 0) < Math.max(1, h.goal)) out.push({ ...habitReminder(h), key: `${uid}:${date}:h:${h._id}` });
      }
    }
    for (const t of await loadTodos(uid, date, date, { reminder: true, startTime: time })) {
      if (!t.done) out.push({ ...todoReminder(t), key: `${uid}:${date}:t:${t._id}` });
    }
  }
  if (r.mood && time === r.moodTime && !(await Mood.exists({ userId: uid, date }))) {
    out.push({ ...moodReminder(), key: `${uid}:${date}:mood` });
  }
  if (r.streak && time === STREAK_TIME) {
    const { habits, counts } = await loadHabits(uid, addDays(date, -400), date);
    const atRisk = habits
      .map((h) => habitToday(h, counts.get(h._id) ?? new Map(), date))
      .filter((h) => h.scheduled && !h.done && h.streak >= 3 && h.streakUnit === "day")
      .sort(byTime);
    if (atRisk.length) out.push({ ...streakReminder(atRisk[0]), key: `${uid}:${date}:streak` });
  }
  return out;
}

type SubDoc = { _id: unknown; userId: unknown; endpoint: string; keys: { p256dh: string; auth: string }; tz: string; updatedAt?: Date };

/**
 * Sends every reminder that fell due in the last few minutes and hasn't been
 * sent yet. Safe to call more often than once a minute, or a little late.
 */
export async function sendDueReminders(now = new Date()): Promise<{ users: number; sent: number }> {
  if (!pushConfigured()) return { users: 0, sent: 0 };
  setupVapid();
  const subs = (await PushSub.find().sort({ updatedAt: -1 }).lean()) as unknown as SubDoc[];
  const byUser = new Map<string, SubDoc[]>();
  for (const s of subs) {
    const uid = String(s.userId);
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid)!.push(s);
  }
  let sent = 0;
  for (const [uid, userSubs] of byUser) {
    try {
      const user = (await User.findById(uid, { "settings.reminders": 1 }).lean()) as { settings?: { reminders?: Parameters<typeof dueAt>[1] } } | null;
      const r = user?.settings?.reminders;
      if (!user || !r || (!r.routine && !r.mood && !r.streak)) continue;
      const tz = validTimeZone(userSubs[0].tz) ? userSubs[0].tz : "UTC";
      const due: Due[] = [];
      // Look back 3 minutes so a late or skipped run still catches reminders.
      for (let i = 2; i >= 0; i--) {
        const { date, time } = localSlot(tz, new Date(now.getTime() - i * 60_000));
        due.push(...(await dueAt(uid, r, date, time)));
      }
      for (const m of due) {
        try {
          await ReminderSent.create({ key: m.key });
        } catch {
          continue; // already sent
        }
        const payload = JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.tag });
        await Promise.all(
          userSubs.map(async (s) => {
            try {
              await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 60 * 30 });
              sent++;
            } catch (e) {
              const code = (e as { statusCode?: number }).statusCode;
              if (code === 404 || code === 410) await PushSub.deleteOne({ _id: s._id });
              else console.error("Push failed", code ?? e);
            }
          }),
        );
      }
    } catch (e) {
      console.error("Reminder check failed for a user", e);
    }
  }
  return { users: byUser.size, sent };
}
