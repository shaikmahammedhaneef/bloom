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
    const name = str(b.name, 60);
    const email = str(b.email, 120).toLowerCase();
    const password = typeof b.password === "string" ? b.password : "";
    if (!name) return fail("Enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address.");
    if (password.length < 8) return fail("Use at least 8 characters for your password.");
    await dbConnect();
    if (await User.exists({ email })) return fail("An account with this email already exists. Sign in instead.", 409);
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
    const res = NextResponse.json({ ok: true, onboarded: false });
    res.cookies.set(COOKIE, await createToken(String(user._id)), cookieOptions);
    return res;
  } catch (e) {
    return serverError(e);
  }
}
