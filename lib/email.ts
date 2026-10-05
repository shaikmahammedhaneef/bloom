// Sends email through Resend (https://resend.com). Set RESEND_API_KEY and
// EMAIL_FROM, e.g. "Bloom <hello@yourdomain.com>".
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendEmail(to: string, subject: string, text: string, html: string) {
  if (!emailConfigured()) throw new Error("Email isn't set up on this server.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend refused the email (${res.status}): ${await res.text().catch(() => "")}`);
}

/** The site's public address, for links in emails. */
export function appUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return new URL(req.url).origin; // local development
}
