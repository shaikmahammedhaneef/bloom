"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Bar, Tile } from "@/components/ui";
import { api } from "@/lib/client";
import { GOALS, RECHARGE, TEMPLATES, suggestTemplates } from "@/lib/catalog";
import { fmtTime, timeRange, toKey } from "@/lib/dates";
import type { Me } from "@/lib/types";

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<string[]>([]);
  const [recharge, setRecharge] = useState("");
  const [roleModel, setRoleModel] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Me>("/api/me").then((m) => setName(m.name)).catch(() => {});
    try {
      const t = JSON.parse(localStorage.getItem("bloom-theme") || "{}");
      if (t.dark) document.documentElement.dataset.theme = "dark";
    } catch {}
  }, []);

  const toggleGoal = (k: string) =>
    setGoals((g) => (g.includes(k) ? g.filter((x) => x !== k) : g.length >= 3 ? g : [...g, k]));

  function next() {
    setError(null);
    if (step === 0 && !goals.length) return setError("Pick at least one thing to work on.");
    if (step === 2) setPicked(suggestTemplates(goals));
    setStep((s) => s + 1);
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/onboarding", { body: { goals, recharge, roleModel, templates: picked, today: toKey() } });
      window.location.href = "/today";
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const suggestions = TEMPLATES.filter((t) => suggestTemplates(goals).includes(t.key));
  const others = TEMPLATES.filter((t) => !suggestions.includes(t));

  return (
    <main className="shell bare">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {step > 0 ? (
          <button type="button" className="icon-btn" aria-label="Back" onClick={() => setStep((s) => s - 1)}><Icon name="chevL" /></button>
        ) : <span style={{ width: 44 }} />}
        <div className="grow"><Bar pct={((step + 1) / 4) * 100} /></div>
        <span className="muted small" style={{ fontWeight: 600 }}>{step + 1} of 4</span>
      </div>

      {step === 0 && (
        <>
          <div className="stack">
            <h1 className="h1" style={{ fontSize: 28 }}>{name ? `Hi ${name}. ` : ""}What do you want to work on?</h1>
            <p className="muted">Pick up to three. We’ll shape your routines around them.</p>
          </div>
          <div className="grid2">
            {GOALS.map((g) => {
              const on = goals.includes(g.key);
              return (
                <button key={g.key} type="button" className="choice" aria-pressed={on} onClick={() => toggleGoal(g.key)}>
                  <Tile icon={g.icon} tone={on ? "sage" : "plain"} size={36} radius={10} iconSize={18} />
                  {g.name}
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div className="stack">
            <h1 className="h1" style={{ fontSize: 28 }}>How do you recharge?</h1>
            <p className="muted">This helps us suggest the right kind of breaks.</p>
          </div>
          <div className="stack">
            {RECHARGE.map((r) => (
              <button key={r} type="button" className="choice" aria-pressed={recharge === r} onClick={() => setRecharge(r)}>{r}</button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="stack">
            <h1 className="h1" style={{ fontSize: 28 }}>Who do you want to become?</h1>
            <p className="muted">Describe the person you’re working towards. We’ll remind you of it when a habit feels hard.</p>
          </div>
          <div className="field">
            <label htmlFor="rm">Your goal</label>
            <textarea id="rm" className="input" placeholder="A calm, rested person who finishes what they start" value={roleModel} onChange={(e) => setRoleModel(e.target.value)} maxLength={200} />
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="stack">
            <h1 className="h1" style={{ fontSize: 28 }}>Your starter plan</h1>
            <p className="muted">Suggested from your answers. Every habit has a from and to time you can change later.</p>
          </div>
          {[...suggestions, ...others].map((t, i) => {
            const on = picked.includes(t.key);
            return (
              <div key={t.key} className="stack">
                {i === suggestions.length && <div className="section-title" style={{ marginTop: 8 }}>More routines</div>}
                <div className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Tile icon={t.icon} tone={t.tone} />
                    <div className="grow">
                      <div className="row-title">{t.name}</div>
                      <div className="row-meta">{t.habits.length} habits, {timeRange(t.habits[0].startTime, t.habits[t.habits.length - 1].endTime)}</div>
                    </div>
                    <button type="button" className="pill" aria-pressed={on} onClick={() => setPicked((p) => (on ? p.filter((x) => x !== t.key) : [...p, t.key]))}>
                      <Icon name={on ? "check" : "plus"} size={16} />{on ? "Added" : "Add"}
                    </button>
                  </div>
                  <div className="hstack">
                    {t.habits.map((h) => <span key={h.name} className="chip">{fmtTime(h.startTime)} {h.name}</span>)}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {error && <div className="error" role="alert">{error}</div>}
      <div style={{ flex: 1 }} />
      {step < 3 ? (
        <button type="button" className="btn primary block" onClick={next}>{step === 1 && !recharge ? "Skip" : step === 2 && !roleModel ? "Skip" : "Continue"}</button>
      ) : (
        <button type="button" className="btn primary block" onClick={finish} disabled={busy}>{busy ? "Setting up…" : picked.length ? "Start my plan" : "Start with an empty plan"}</button>
      )}
    </main>
  );
}
