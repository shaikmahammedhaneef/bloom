import { NextResponse } from "next/server";
import { getUserId } from "./auth";
import { dbConnect } from "./db";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export function serverError(e: unknown) {
  if (e instanceof HttpError) return fail(e.message, e.status);
  const err = e as { message?: string; name?: string; code?: number };
  if (err?.message?.startsWith("MONGODB_URI")) return fail(err.message, 500);
  if (err?.name?.includes("ServerSelection") || err?.name === "MongoParseError") {
    return fail("Can't reach the database. Check MONGODB_URI in .env.local and that MongoDB is running.", 503);
  }
  if (err?.code === 11000) return fail("That already exists.", 409);
  console.error(e);
  return fail("Something went wrong on the server. Check the terminal for details.", 500);
}

export async function withUser(fn: (uid: string) => Promise<Response>): Promise<Response> {
  const uid = await getUserId();
  if (!uid) return fail("Sign in to continue.", 401);
  try {
    await dbConnect();
    return await fn(uid);
  } catch (e) {
    return serverError(e);
  }
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    if (!b || typeof b !== "object") throw new Error();
    return b as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Request body must be a JSON object.");
  }
}

export function isObjectId(s: string) {
  return /^[a-f0-9]{24}$/i.test(s);
}

export function str(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function num(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
