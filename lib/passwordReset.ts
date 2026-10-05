import { createHash, randomBytes } from "node:crypto";

export const RESET_MINUTES = 60;
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
export const passwordProblem = (p: unknown): string | null =>
  typeof p !== "string" || p.length < 8 ? "Use at least 8 characters for your password." : p.length > 200 ? "That password is too long." : null;
