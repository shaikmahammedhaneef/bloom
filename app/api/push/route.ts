import { PushSub } from "@/models";
import { HttpError, ok, readBody, str, withUser } from "@/lib/server";
import { pushConfigured, validTimeZone, vapidPublicKey } from "@/lib/pushServer";

// The public key the browser needs to subscribe. Empty when push isn't set up.
export async function GET() {
  return withUser(async () => ok({ publicKey: pushConfigured() ? vapidPublicKey() : "" }));
}

// Saves this browser's push subscription for the signed-in user.
export async function POST(req: Request) {
  return withUser(async (uid) => {
    const b = await readBody(req);
    const sub = b.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined;
    const endpoint = str(sub?.endpoint, 1000);
    const p256dh = str(sub?.keys?.p256dh, 200);
    const auth = str(sub?.keys?.auth, 200);
    if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) throw new HttpError(400, "That push subscription isn't valid.");
    const tz = validTimeZone(b.tz) ? b.tz : "UTC";
    await PushSub.updateOne({ endpoint }, { $set: { userId: uid, keys: { p256dh, auth }, tz } }, { upsert: true });
    return ok({ ok: true });
  });
}

// Stops push reminders to this browser (for example when signing out).
export async function DELETE(req: Request) {
  return withUser(async (uid) => {
    const b = await readBody(req);
    await PushSub.deleteOne({ endpoint: str(b.endpoint, 1000), userId: uid });
    return ok({ ok: true });
  });
}
