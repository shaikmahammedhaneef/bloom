import { User } from "@/models";
import { HttpError, num, ok, readBody, str, withUser } from "@/lib/server";
import { ACCENTS, GOALS } from "@/lib/catalog";
import { isTime } from "@/lib/dates";

const SAFE = "-passwordHash -__v";

export async function GET() {
  return withUser(async (uid) => {
    const user = await User.findById(uid).select(SAFE).lean();
    if (!user) throw new HttpError(401, "Your account wasn't found. Sign in again.");
    return ok(user);
  });
}

export async function PATCH(req: Request) {
  return withUser(async (uid) => {
    const b = await readBody(req);
    const set: Record<string, unknown> = {};
    if ("name" in b) {
      const n = str(b.name, 60);
      if (!n) throw new HttpError(400, "Your name can't be empty.");
      set.name = n;
    }
    if ("roleModel" in b) set.roleModel = str(b.roleModel, 200);
    if ("recharge" in b) set.recharge = str(b.recharge, 60);
    if ("goals" in b && Array.isArray(b.goals)) set.goals = b.goals.filter((g) => GOALS.some((x) => x.key === g)).slice(0, 3);
    if ("onboarded" in b) set.onboarded = Boolean(b.onboarded);
    const s = b.settings as Record<string, unknown> | undefined;
    if (s && typeof s === "object") {
      if ("accent" in s && ACCENTS.some((a) => a.key === s.accent)) set["settings.accent"] = s.accent;
      if ("dark" in s) set["settings.dark"] = Boolean(s.dark);
      if ("waterGoal" in s) set["settings.waterGoal"] = num(s.waterGoal, 1, 30, 8);
      if ("stepGoal" in s) set["settings.stepGoal"] = num(s.stepGoal, 500, 100000, 8000);
      const r = s.reminders as Record<string, unknown> | undefined;
      if (r && typeof r === "object") {
        for (const k of ["routine", "mood", "streak"]) if (k in r) set[`settings.reminders.${k}`] = Boolean(r[k]);
        if ("moodTime" in r) {
          if (!isTime(r.moodTime)) throw new HttpError(400, "Mood reminder time must look like 21:00.");
          set["settings.reminders.moodTime"] = r.moodTime;
        }
      }
    }
    const user = await User.findByIdAndUpdate(uid, { $set: set }, { new: true }).select(SAFE).lean();
    return ok(user);
  });
}
