import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { PasswordReset, User } from "@/models";
import { cookieOptions } from "@/lib/auth";
import { COOKIE, createToken } from "@/lib/jwt";
import { hashToken, passwordProblem } from "@/lib/passwordReset";
import { fail, readBody, serverError } from "@/lib/server";

// Sets a new password from a reset link, then signs the user in.
export async function POST(req: Request) {
  try {
    const b = await readBody(req);
    const token = typeof b.token === "string" ? b.token : "";
    const problem = passwordProblem(b.password);
    if (problem) return fail(problem);
    if (!token) return fail("This reset link is incomplete. Open the link from the email again.");
    await dbConnect();
    // Used once: the row is removed as it's read.
    const reset = (await PasswordReset.findOneAndDelete({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } }).lean()) as { userId: unknown } | null;
    if (!reset) return fail("This reset link has expired or was already used. Ask for a new one.", 400);
    const user = await User.findByIdAndUpdate(reset.userId, { $set: { passwordHash: await bcrypt.hash(b.password as string, 10) } }, { new: true });
    if (!user) return fail("That account no longer exists.", 404);
    await PasswordReset.deleteMany({ userId: reset.userId });
    const res = NextResponse.json({ ok: true, onboarded: Boolean(user.onboarded) });
    res.cookies.set(COOKIE, await createToken(String(user._id)), cookieOptions);
    return res;
  } catch (e) {
    return serverError(e);
  }
}
