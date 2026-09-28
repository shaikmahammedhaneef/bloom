import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models";
import { createToken, COOKIE } from "@/lib/jwt";
import { cookieOptions } from "@/lib/auth";
import { fail, readBody, serverError, str } from "@/lib/server";

export async function POST(req: Request) {
  try {
    const b = await readBody(req);
    const email = str(b.email, 120).toLowerCase();
    const password = typeof b.password === "string" ? b.password : "";
    if (!email || !password) return fail("Enter your email and password.");
    await dbConnect();
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return fail("That email and password don't match. Try again.", 401);
    }
    const res = NextResponse.json({ ok: true, onboarded: Boolean(user.onboarded) });
    res.cookies.set(COOKIE, await createToken(String(user._id)), cookieOptions);
    return res;
  } catch (e) {
    return serverError(e);
  }
}
