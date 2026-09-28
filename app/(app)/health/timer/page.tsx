"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Header, Seg, Toast } from "@/components/ui";
import { api, useToast } from "@/lib/client";
import { toKey } from "@/lib/dates";
import { showNotification } from "@/lib/notify";

const PATTERNS = [
  { key: "box", name: "Box 4-4-4-4", phases: [["Breathe in", 4], ["Hold", 4], ["Breathe out", 4], ["Hold", 4]] as [string, number][] },
  { key: "relax", name: "Relax 4-7-8", phases: [["Breathe in", 4], ["Hold", 7], ["Breathe out", 8]] as [string, number][] },
  { key: "calm", name: "Calm 5-5", phases: [["Breathe in", 5], ["Breathe out", 5]] as [string, number][] },
];

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 660;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.6);
  } catch {}
}

export default function TimerPage() {
  const [mode, setMode] = useState<"breathe" | "focus">("breathe");
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("mode");
    if (m === "focus") setMode("focus");
  }, []);
  const toast = useToast();
  const logSession = useCallback(async (type: string, minutes: number, label: string) => {
    try {
      await api("/api/sessions", { body: { date: toKey(), type, minutes, label } });
      toast.show(`${label} logged. +5 points`);
    } catch (e) {
      toast.show((e as Error).message);
    }
  }, [toast]);

  return (
    <main className="shell">
      <Header title="Breathe and focus" back="/health" small />
      <Seg label="Timer" value={mode} onChange={setMode} options={[{ value: "breathe", label: "Breathe" }, { value: "focus", label: "Focus" }]} />
      {mode === "breathe" ? <Breathe onDone={logSession} /> : <Focus onDone={logSession} />}
      <Toast msg={toast.msg} />
    </main>
  );
}

function Breathe({ onDone }: { onDone: (t: string, m: number, l: string) => void }) {
  const [pattern, setPattern] = useState(PATTERNS[0]);
  const [minutes, setMinutes] = useState(3);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [left, setLeft] = useState(pattern.phases[0][1]);
  const [elapsed, setElapsed] = useState(0);
  const state = useRef({ phase: 0, left: 0, elapsed: 0 });

  useEffect(() => {
    if (!running) return;
    state.current = { phase: 0, left: pattern.phases[0][1], elapsed: 0 };
    setPhase(0);
    setLeft(pattern.phases[0][1]);
    setElapsed(0);
    const id = setInterval(() => {
      const s = state.current;
      s.elapsed++;
      s.left--;
      if (s.left <= 0) {
        s.phase = (s.phase + 1) % pattern.phases.length;
        s.left = pattern.phases[s.phase][1];
      }
      setPhase(s.phase);
      setLeft(s.left);
      setElapsed(s.elapsed);
      if (s.elapsed >= minutes * 60) {
        clearInterval(id);
        setRunning(false);
        beep();
        onDone("breathe", minutes, "Breathing session");
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running, pattern, minutes, onDone]);

  const [label, secs] = pattern.phases[phase];
  const scale = !running ? 0.8 : label === "Breathe in" ? 1.45 : label === "Breathe out" ? 0.8 : phase > 0 && pattern.phases[phase - 1][0] === "Breathe in" ? 1.45 : 0.8;
  const remaining = minutes * 60 - elapsed;

  return (
    <>
      <div className="breath" aria-live="polite">
        <div className="breath-ring" />
        <div className="breath-core" style={{ transform: `scale(${scale})`, transitionDuration: `${running ? secs : 0.3}s` }} />
        <div className="breath-text">
          <div style={{ fontWeight: 600, fontSize: 17 }}>{running ? label : "Ready when you are"}</div>
          {running && <div style={{ fontFamily: "var(--fd)", fontSize: 50, fontWeight: 600, lineHeight: 1.1 }}>{left}</div>}
        </div>
      </div>
      {running && <div className="muted small" style={{ textAlign: "center" }}>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} left</div>}
      <div className="field">
        <span className="flabel">Pattern</span>
        <div className="hstack">{PATTERNS.map((p) => <button key={p.key} type="button" className="pill" aria-pressed={pattern.key === p.key} disabled={running} onClick={() => setPattern(p)}>{p.name}</button>)}</div>
      </div>
      <div className="field">
        <span className="flabel">Length</span>
        <div className="hstack">{[1, 3, 5, 10].map((m) => <button key={m} type="button" className="pill" aria-pressed={minutes === m} disabled={running} onClick={() => setMinutes(m)}>{m} min</button>)}</div>
      </div>
      <button type="button" className={`btn block ${running ? "" : "primary"}`} onClick={() => setRunning(!running)}>
        <Icon name={running ? "pause" : "play"} size={18} />{running ? "Stop" : "Start breathing"}
      </button>
    </>
  );
}

function Focus({ onDone }: { onDone: (t: string, m: number, l: string) => void }) {
  const [work, setWork] = useState(25);
  const [brk, setBrk] = useState(5);
  const [rounds, setRounds] = useState(4);
  const [round, setRound] = useState(1);
  const [onBreak, setOnBreak] = useState(false);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const ref = useRef({ left: 25 * 60, onBreak: false, round: 1 });

  useEffect(() => {
    if (!running) {
      setLeft(work * 60);
      ref.current = { left: work * 60, onBreak: false, round: 1 };
      setRound(1);
      setOnBreak(false);
    }
  }, [work, running]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const s = ref.current;
      s.left--;
      if (s.left <= 0) {
        beep();
        if (!s.onBreak) {
          onDone("focus", work, "Focus session");
          showNotification("Focus session done", s.round >= rounds ? "All rounds finished." : `Take a ${brk}-minute break.`, "/health/timer");
          if (s.round >= rounds) {
            clearInterval(id);
            setRunning(false);
            return;
          }
          s.onBreak = true;
          s.left = brk * 60;
        } else {
          s.onBreak = false;
          s.round++;
          s.left = work * 60;
        }
      }
      setLeft(s.left);
      setOnBreak(s.onBreak);
      setRound(s.round);
    }, 1000);
    return () => clearInterval(id);
  }, [running, work, brk, rounds, onDone]);

  return (
    <>
      <section className="card" style={{ alignItems: "center", textAlign: "center", padding: "28px 16px" }} aria-live="polite">
        <div className="muted" style={{ fontWeight: 600 }}>{onBreak ? "Break" : `Focus, round ${round} of ${rounds}`}</div>
        <div style={{ fontFamily: "var(--fd)", fontSize: 64, fontWeight: 600, lineHeight: 1.1 }}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</div>
        <div className="hstack" style={{ justifyContent: "center", gap: 6 }}>
          {Array.from({ length: rounds }, (_, i) => <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < round - (onBreak ? 0 : 1) ? "var(--acc)" : "var(--line)" }} />)}
        </div>
      </section>
      <div className="field">
        <span className="flabel">Focus length</span>
        <div className="hstack">{[15, 25, 50].map((m) => <button key={m} type="button" className="pill" aria-pressed={work === m} disabled={running} onClick={() => setWork(m)}>{m} min</button>)}</div>
      </div>
      <div className="grid2">
        <div className="field">
          <span className="flabel">Break</span>
          <div className="hstack">{[5, 10].map((m) => <button key={m} type="button" className="pill" aria-pressed={brk === m} disabled={running} onClick={() => setBrk(m)}>{m} min</button>)}</div>
        </div>
        <div className="field">
          <span className="flabel">Rounds</span>
          <div className="hstack">{[2, 4].map((m) => <button key={m} type="button" className="pill" aria-pressed={rounds === m} disabled={running} onClick={() => setRounds(m)}>{m}</button>)}</div>
        </div>
      </div>
      <button type="button" className={`btn block ${running ? "" : "primary"}`} onClick={() => setRunning(!running)}>
        <Icon name={running ? "pause" : "play"} size={18} />{running ? "Stop" : "Start focus"}
      </button>
    </>
  );
}
