"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api<{ onboarded: boolean }>(`/api/auth/${mode}`, { body: isLogin ? { email, password } : { name, email, password } });
      window.location.href = r.onboarded ? "/today" : "/onboarding";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="shell bare" style={{ justifyContent: "center" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <svg width="120" height="96" viewBox="0 0 300 230" aria-hidden="true">
          <circle cx="150" cy="120" r="104" fill="var(--acc-soft)" />
          <path d="M150 188 C150 150 150 130 150 104" stroke="var(--acc)" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M150 140 C120 138 104 118 102 96 C128 96 146 112 150 140z" fill="var(--heat-2)" stroke="var(--acc)" strokeWidth="4" />
          <path d="M150 124 C176 122 194 102 196 80 C170 82 154 98 150 124z" fill="var(--heat-2)" stroke="var(--acc)" strokeWidth="4" />
          <circle cx="150" cy="98" r="13" fill="var(--surf)" stroke="#C8643B" strokeWidth="4" />
        </svg>
        <h1 className="h1" style={{ fontSize: 42 }}>Bloom</h1>
        <p className="muted">{isLogin ? "Welcome back. Sign in to your routines." : "Small routines. Calmer, steadier days."}</p>
      </div>
      <form className="card" onSubmit={submit} noValidate>
        {!isLogin && (
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" className="input" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" className="input" autoComplete={isLogin ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          {!isLogin && <span className="muted small">At least 8 characters.</span>}
        </div>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? "Please wait…" : isLogin ? "Sign in" : "Create account"}</button>
      </form>
      <p className="muted" style={{ textAlign: "center" }}>
        {isLogin ? "New to Bloom? " : "Already have an account? "}
        <Link href={isLogin ? "/register" : "/login"} style={{ fontWeight: 600 }}>{isLogin ? "Create an account" : "Sign in"}</Link>
      </p>
      <p className="muted small" style={{ textAlign: "center" }}>Your routines are saved to your account, so they sync across devices.</p>
    </main>
  );
}
