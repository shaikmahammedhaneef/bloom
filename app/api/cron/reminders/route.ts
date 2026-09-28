import { dbConnect } from "@/lib/db";
import { fail, ok, serverError } from "@/lib/server";
import { pushConfigured, sendDueReminders } from "@/lib/pushServer";

// Call this about once a minute to send reminders while Bloom is closed, with
// the header "Authorization: Bearer <CRON_SECRET>" (Vercel Cron sends it for
// you) or ?secret=<CRON_SECRET> for cron services that can't set headers.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return fail("Set CRON_SECRET to use this endpoint.", 503);
  const url = new URL(req.url);
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? url.searchParams.get("secret");
  if (given !== secret) return fail("Not allowed.", 401);
  if (!pushConfigured()) return fail("Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to send push reminders.", 503);
  try {
    await dbConnect();
    return ok(await sendDueReminders());
  } catch (e) {
    return serverError(e);
  }
}

export const POST = GET;
export const dynamic = "force-dynamic";
