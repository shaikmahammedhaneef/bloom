"use client";
// In-app reminders. They fire while Bloom is open, in a tab or as an installed
// app (as a system notification if you've allowed it, otherwise as a banner).
// When Bloom is closed, the server sends the same reminders by Web Push.
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { nowTime, toKey } from "@/lib/dates";
import { showNotification } from "@/lib/notify";
import { habitReminder, moodReminder, STREAK_TIME, streakReminder, todoReminder, type ReminderMsg } from "@/lib/reminderText";
import type { Me, TodayData } from "@/lib/types";

async function notify(m: ReminderMsg, show: (m: string) => void) {
  if (!(await showNotification(m.title, m.body, m.url))) show(`${m.title} — ${m.body}`);
}

function once(key: string): boolean {
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

export default function Reminders({ me }: { me: Me }) {
  const [banner, setBanner] = useState<string | null>(null);
  const cache = useRef<{ at: number; data: TodayData | null }>({ at: 0, data: null });

  useEffect(() => {
    const r = me.settings.reminders;
    if (!r.routine && !r.mood && !r.streak) return;
    const show = (m: string) => {
      setBanner(m);
      setTimeout(() => setBanner(null), 8000);
    };
    const tick = async () => {
      const date = toKey();
      const now = nowTime();
      if (Date.now() - cache.current.at > 60_000 || cache.current.data?.date !== date) {
        try {
          cache.current = { at: Date.now(), data: await api<TodayData>(`/api/today?date=${date}`) };
        } catch {
          return;
        }
      }
      const d = cache.current.data;
      if (!d) return;
      if (r.routine) {
        for (const h of d.habits) {
          if (h.reminder && !h.done && h.startTime === now && once(`bloom-n:${date}:h:${h._id}`)) notify(habitReminder(h), show);
        }
        for (const t of d.todos) {
          if (t.reminder && !t.done && t.startTime === now && once(`bloom-n:${date}:t:${t._id}`)) notify(todoReminder(t), show);
        }
      }
      if (r.mood && now === r.moodTime && !d.mood && once(`bloom-n:${date}:mood`)) {
        notify(moodReminder(), show);
      }
      if (r.streak && now === STREAK_TIME) {
        const atRisk = d.habits.filter((h) => !h.done && h.streak >= 3 && h.streakUnit === "day");
        if (atRisk.length && once(`bloom-n:${date}:streak`)) notify(streakReminder(atRisk[0]), show);
      }
    };
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, [me.settings.reminders]);

  return banner ? <div className="toast" role="status" style={{ bottom: 170 }}>{banner}</div> : null;
}
