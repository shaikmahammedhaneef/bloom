import { daysBetween } from "./dates";
import { CHALLENGES } from "./catalog";
import type { ChallengeView } from "./types";

export type ChallengeDoc = { _id: unknown; key: string; startDate: string; doneDates: string[]; status: ChallengeView["status"] };

export function view(d: ChallengeDoc, today: string): ChallengeView | null {
  const def = CHALLENGES.find((c) => c.key === d.key);
  if (!def) return null;
  return {
    _id: String(d._id), key: d.key, name: def.name, task: def.task, icon: def.icon, tone: def.tone, days: def.days,
    startDate: d.startDate, day: Math.min(def.days, daysBetween(d.startDate, today) + 1), doneDates: d.doneDates,
    doneToday: d.doneDates.includes(today), status: d.status,
  };
}

