import { User } from "@/models";
import { ok, readBody, str, withUser } from "@/lib/server";
import { GOALS } from "@/lib/catalog";
import { isKey, toKey } from "@/lib/dates";
import { applyTemplate } from "@/lib/templatesServer";

export async function POST(req: Request) {
  return withUser(async (uid) => {
    const b = await readBody(req);
    const today = isKey(b.today) ? b.today : toKey();
    const goals = Array.isArray(b.goals) ? b.goals.filter((g) => GOALS.some((x) => x.key === g)).slice(0, 3) : [];
    const templates = Array.isArray(b.templates) ? b.templates.map(String) : [];
    let added = 0;
    for (const key of templates) added += await applyTemplate(uid, key, today);
    await User.updateOne(
      { _id: uid },
      { $set: { goals, recharge: str(b.recharge, 60), roleModel: str(b.roleModel, 200), onboarded: true } }
    );
    return ok({ added });
  });
}
