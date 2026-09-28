"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Bar, Header, Ring, Tile, Toast } from "@/components/ui";
import { api, useToast } from "@/lib/client";
import { WORKOUTS, type Workout } from "@/lib/catalog";
import { fmtDur, toKey } from "@/lib/dates";

const total = (w: Workout) => w.steps.reduce((a, s) => a + s.secs, 0);

export default function WorkoutPage() {
  const [active, setActive] = useState<Workout | null>(null);
  const toast = useToast();

  async function finish(w: Workout) {
    setActive(null);
    try {
      await api("/api/sessions", { body: { date: toKey(), type: "workout", minutes: Math.round(total(w) / 60), label: w.name } });
      toast.show(`${w.name} done. +5 points`);
    } catch (e) {
      toast.show((e as Error).message);
    }
  }

  return (
    <main className="shell">
      {active ? (
        <Player w={active} onQuit={() => setActive(null)} onFinish={() => finish(active)} />
      ) : (
        <>
          <Header title="Workouts" sub="Short guided sessions. No equipment needed." back="/health" small />
          <div className="stack">
            {WORKOUTS.map((w) => (
              <div key={w.key} className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Tile icon={w.icon} tone={w.tone} size={52} radius={16} iconSize={24} />
                  <div className="grow">
                    <div className="row-title">{w.name}</div>
                    <div className="row-meta">{fmtDur(Math.round(total(w) / 60))}  ·  {w.steps.filter((s) => !s.rest).length} moves  ·  {w.level}</div>
                  </div>
                </div>
                <div className="hstack">{w.steps.filter((s) => !s.rest).slice(0, 4).map((s) => <span key={s.name} className="chip">{s.name}</span>)}</div>
                <button type="button" className="btn primary" onClick={() => setActive(w)}><Icon name="play" size={18} />Start</button>
              </div>
            ))}
          </div>
        </>
      )}
      <Toast msg={toast.msg} />
    </main>
  );
}

function Player({ w, onQuit, onFinish }: { w: Workout; onQuit: () => void; onFinish: () => void }) {
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(w.steps[0].secs);
  const [paused, setPaused] = useState(false);
  const ref = useRef({ i: 0, left: w.steps[0].secs });

  const go = (n: number) => {
    if (n >= w.steps.length) return onFinish();
    ref.current = { i: n, left: w.steps[n].secs };
    setI(n);
    setLeft(w.steps[n].secs);
  };

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const s = ref.current;
      s.left--;
      if (s.left <= 0) {
        if (s.i + 1 >= w.steps.length) {
          clearInterval(id);
          onFinish();
          return;
        }
        s.i++;
        s.left = w.steps[s.i].secs;
        setI(s.i);
      }
      setLeft(s.left);
    }, 1000);
    return () => clearInterval(id);
  }, [paused, w, onFinish]);

  const step = w.steps[i];
  const next = w.steps[i + 1];
  return (
    <>
      <Header title={w.name} small right={<button type="button" className="icon-btn" aria-label="Quit workout" onClick={onQuit}><Icon name="x" /></button>} />
      <Bar pct={(i / w.steps.length) * 100} />
      <div className="muted small">Step {i + 1} of {w.steps.length}</div>
      <section className="card" style={{ alignItems: "center", textAlign: "center", gap: 16, padding: "28px 16px" }} aria-live="polite">
        <div className="h2" style={{ fontSize: 26 }}>{step.name}</div>
        <Ring pct={(left / step.secs) * 100} size={180} stroke={12} color={step.rest ? "var(--t-sky-fg)" : "var(--acc)"}>
          <span style={{ fontFamily: "var(--fd)", fontSize: 54, fontWeight: 600 }}>{left}</span>
          <span className="muted small">seconds</span>
        </Ring>
        {next && <div className="muted">Next: <b style={{ color: "var(--ink)" }}>{next.name}</b></div>}
      </section>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="btn" style={{ flex: 1 }} onClick={() => go(Math.max(0, i - 1))} disabled={i === 0} aria-label="Previous step"><Icon name="chevL" /></button>
        <button type="button" className="btn primary" style={{ flex: 3 }} onClick={() => setPaused(!paused)}><Icon name={paused ? "play" : "pause"} size={18} />{paused ? "Resume" : "Pause"}</button>
        <button type="button" className="btn" style={{ flex: 1 }} onClick={() => go(i + 1)} aria-label="Skip step"><Icon name="skip" /></button>
      </div>
    </>
  );
}
