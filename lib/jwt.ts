// Edge-safe JWT helpers (used by middleware and the server).
import { SignJWT, jwtVerify } from "jose";

export const COOKIE = "bloom_token";

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "dev-only-secret-change-me-in-env-local");
}

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
