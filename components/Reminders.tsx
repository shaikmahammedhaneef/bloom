"use client";
// In-app reminders. They fire while Bloom is open in a browser tab (as a system
// notification if you've allowed it, otherwise as an on-screen banner).
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { nowTime, toKey } from "@/lib/dates";
import type { Me, TodayData } from "@/lib/types";

function notify(title: string, body: string, show: (m: string) => void) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification(title, { body, tag: title + body });
      return;
    } catch {}
  }
  show(`${title} — ${body}`);
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
          if (h.reminder && !h.done && h.startTime === now && once(`bloom-n:${date}:h:${h._id}`)) {
            notify(h.name, h.endTime ? `Now until ${h.endTime}` : "It's time", show);
          }
        }
        for (const t of d.todos) {
          if (t.reminder && !t.done && t.startTime === now && once(`bloom-n:${date}:t:${t._id}`)) {
            notify(t.title, t.endTime ? `Now until ${t.endTime}` : "It's time", show);
          }
        }
      }
      if (r.mood && now === r.moodTime && !d.mood && once(`bloom-n:${date}:mood`)) {
        notify("How are you feeling?", "Take a moment to check in.", show);
      }
      if (r.streak && now === "20:00") {
        const atRisk = d.habits.filter((h) => !h.done && h.streak >= 3 && h.streakUnit === "day");
        if (atRisk.length && once(`bloom-n:${date}:streak`)) {
          notify("Keep your streak going", `${atRisk[0].name} — ${atRisk[0].streak} days so far`, show);
        }
      }
    };
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, [me.settings.reminders]);

  return banner ? <div className="toast" role="status" style={{ bottom: 170 }}>{banner}</div> : null;
}
