"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    if (password !== confirm) return setError("The two passwords don’t match.");
    setBusy(true);
    try {
      const r = await api<{ onboarded: boolean }>("/api/auth/reset", { body: { token, password } });
      window.location.href = r.onboarded ? "/today" : "/onboarding";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="shell bare" style={{ justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <h1 className="h1">Choose a new password</h1>
        <p className="muted">You’ll be signed in when it’s saved.</p>
      </div>
      {token === "" ? (
        <div className="card" role="alert">
          <span>This link is missing its code. Open the link from your email again, or ask for a new one.</span>
          <Link href="/forgot-password" className="btn sm" style={{ alignSelf: "flex-start" }}>Get a new link</Link>
        </div>
      ) : (
        <form className="card" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="new-password">New password</label>
            <input id="new-password" type="password" className="input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            <span className="muted small">At least 8 characters.</span>
          </div>
          <div className="field">
            <label htmlFor="confirm-password">Type it again</label>
            <input id="confirm-password" type="password" className="input" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {error && (
            <div className="error" role="alert">
              {error}{" "}
              {/expired|already used/.test(error) && <Link href="/forgot-password" style={{ fontWeight: 600 }}>Get a new link</Link>}
            </div>
          )}
          <button className="btn primary block" disabled={busy || token === null}>{busy ? "Saving…" : "Save new password"}</button>
        </form>
      )}
    </main>
  );
}
