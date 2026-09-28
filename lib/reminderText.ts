// Reminder wording, shared by the in-app reminders and the push sender so the
// same reminder has the same title, body and tag (Chrome then shows it once).
import { fmtTime } from "./dates";

export type ReminderMsg = { title: string; body: string; url: string; tag: string };

const msg = (title: string, body: string, url: string): ReminderMsg => ({ title, body, url, tag: title + body });

export const habitReminder = (h: { name: string; endTime?: string }) =>
  msg(h.name, h.endTime ? `Now until ${fmtTime(h.endTime)}` : "It's time", "/today");

export const todoReminder = (t: { title: string; endTime?: string }) =>
  msg(t.title, t.endTime ? `Now until ${fmtTime(t.endTime)}` : "It's time", "/schedule");

export const moodReminder = () => msg("How are you feeling?", "Take a moment to check in.", "/mood");

export const STREAK_TIME = "20:00";
export const streakReminder = (h: { name: string; streak: number }) =>
  msg("Keep your streak going", `${h.name} — ${h.streak} days so far`, "/habits");
