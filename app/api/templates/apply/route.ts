import { ok, readBody, withUser } from "@/lib/server";
import { isKey, toKey } from "@/lib/dates";
import { applyTemplate } from "@/lib/templatesServer";

export async function POST(req: Request) {
  return withUser(async (uid) => {
    const b = await readBody(req);
    const added = await applyTemplate(uid, String(b.key), isKey(b.today) ? b.today : toKey());
    return ok({ added });
  });
}
