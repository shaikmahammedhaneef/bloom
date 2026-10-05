"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/api/auth/forgot", { body: { email } });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell bare" style={{ justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <h1 className="h1">Forgot your password?</h1>
        <p className="muted">We’ll email you a link to choose a new one.</p>
      </div>
      {sent ? (
        <div className="card" role="status">
          <b>Check your email</b>
          <span>If <b>{email}</b> has a Bloom account, a reset link is on its way. It works for 60 minutes. Check your spam folder if you don’t see it.</span>
          <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }} onClick={() => setSent(false)}>Send again</button>
        </div>
      ) : (
        <form className="card" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {error && <div className="error" role="alert">{error}</div>}
          <button className="btn primary block" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
      <p className="muted" style={{ textAlign: "center" }}><Link href="/login" style={{ fontWeight: 600 }}>Back to sign in</Link></p>
    </main>
  );
}
