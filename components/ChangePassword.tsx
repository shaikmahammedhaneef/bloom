"use client";
import { useState } from "react";
import { api } from "@/lib/client";

export default function ChangePassword({ toast }: { toast: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) return setError("Use at least 8 characters for your new password.");
    if (next !== confirm) return setError("The two new passwords don’t match.");
    setBusy(true);
    try {
      await api("/api/auth/password", { body: { current, next } });
      setOpen(false);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast("Password changed");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }} onClick={() => setOpen(true)}>Change password</button>;
  }
  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="pw-current">Current password</label>
        <input id="pw-current" type="password" className="input" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="pw-next">New password</label>
        <input id="pw-next" type="password" className="input" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
        <span className="muted small">At least 8 characters.</span>
      </div>
      <div className="field">
        <label htmlFor="pw-confirm">Type the new password again</label>
        <input id="pw-confirm" type="password" className="input" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      <div className="hstack">
        <button className="btn sm primary" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
        <button type="button" className="btn sm" onClick={() => { setOpen(false); setError(null); }}>Cancel</button>
      </div>
    </form>
  );
}
