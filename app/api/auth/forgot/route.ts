import { dbConnect } from "@/lib/db";
import { PasswordReset, User } from "@/models";
import { appUrl, emailConfigured, sendEmail } from "@/lib/email";
import { hashToken, newToken, RESET_MINUTES } from "@/lib/passwordReset";
import { fail, ok, readBody, serverError, str } from "@/lib/server";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Emails a reset link. The answer is the same whether or not the email has an
// account, so this can't be used to find out who uses Bloom.
export async function POST(req: Request) {
  try {
    if (!emailConfigured()) return fail("Password reset by email isn't set up yet. Ask the site owner to add RESEND_API_KEY and EMAIL_FROM.", 503);
    const email = str((await readBody(req)).email, 120).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter the email you signed up with.");
    await dbConnect();
    const user = (await User.findOne({ email }).select("_id name").lean()) as { _id: unknown; name?: string } | null;
    if (user) {
      // At most 3 open links per account; older ones stop working.
      const open = (await PasswordReset.find({ userId: user._id }).sort({ expiresAt: -1 }).select("_id").lean()) as { _id: unknown }[];
      if (open.length >= 3) await PasswordReset.deleteMany({ _id: { $in: open.slice(2).map((o) => o._id) } });
      const token = newToken();
      await PasswordReset.create({ userId: user._id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) });
      const link = `${appUrl(req)}/reset-password?token=${token}`;
      const hi = user.name ? `Hi ${user.name},` : "Hi,";
      await sendEmail(
        email,
        "Reset your Bloom password",
        `${hi}\n\nSomeone asked to reset the password for your Bloom account. Open this link to choose a new one:\n\n${link}\n\nThe link works for ${RESET_MINUTES} minutes and only once. If you didn't ask for this, you can ignore this email; your password stays the same.`,
        `<p>${esc(hi)}</p><p>Someone asked to reset the password for your Bloom account.</p><p><a href="${esc(link)}" style="display:inline-block;background:#2e6b5a;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:600">Choose a new password</a></p><p>The link works for ${RESET_MINUTES} minutes and only once. If you didn't ask for this, you can ignore this email; your password stays the same.</p>`,
      );
    }
    return ok({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
