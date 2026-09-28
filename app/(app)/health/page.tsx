"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { ErrorBox, Header, Loading, Ring, TimePair, Toast } from "@/components/ui";
import { api, useApi, useToast } from "@/lib/client";
import { duration, fmtDur, fmtLong, parseKey, toKey } from "@/lib/dates";
import type { HealthDay } from "@/lib/types";

type HealthData = {
  today: HealthDay;
  week: { date: string; sleepMin: number | null; steps: number }[];
  weights: { date: string; weight: number }[];
  goals: { water: number; steps: number };
  sessions: { type: string; minutes: number }[];
};

export default function HealthPage() {
  const date = toKey();
  const { data, error, loading, reload, setData } = useApi<HealthData>(`/api/health?date=${date}`);
  const [sleepStart, setSleepStart] = useState("");
  const [sleepEnd, setSleepEnd] = useState("");
  const [steps, setSteps] = useState("");
  const [weight, setWeight] = useState("");
  const toast = useToast();

  useEffect(() => {
    if (!data) return;
    setSleepStart(data.today.sleepStart);
    setSleepEnd(data.today.sleepEnd);
    setSteps(data.today.steps ? String(data.today.steps) : "");
    setWeight(data.today.weight ? String(data.today.weight) : "");
  }, [data?.today.date]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(body: Record<string, unknown>, msg?: string) {
    try {
      await api("/api/health", { body: { date, ...body } });
      if (msg) toast.show(msg);
      reload();
    } catch (e) {
      toast.show((e as Error).message);
    }
  }
  function setWater(n: number) {
    setData((d) => d && { ...d, today: { ...d.today, water: n } });
    save({ water: n });
  }

  if (loading && !data) return <main className="shell"><Loading /></main>;
  if (error && !data) return <main className="shell"><ErrorBox msg={error} retry={reload} /></main>;
  if (!data) return null;
  const { today: t, goals } = data;
  const sleepMin = duration(sleepStart, sleepEnd);
  const maxSleep = Math.max(540, ...data.week.map((w) => w.sleepMin ?? 0));
  const stepPct = Math.min(100, Math.round((t.steps / goals.steps) * 100));
  const ws = data.weights;
  const wChange = ws.length >= 2 ? Math.round((ws[ws.length - 1].weight - ws[0].weight) * 10) / 10 : null;
  const mindful = data.sessions.reduce((a, s) => a + s.minutes, 0);

  return (
    <main className="shell">
      <Header title="Health" sub={fmtLong(date)} />
      <div className="grid3">
        <Link href="/health/timer?mode=breathe" className="choice center tone-sage" style={{ border: "none", fontSize: 14 }}><Icon name="wind" size={24} />Breathe</Link>
        <Link href="/health/timer?mode=focus" className="choice center tone-lilac" style={{ border: "none", fontSize: 14 }}><Icon name="clock" size={24} />Focus</Link>
        <Link href="/health/workout" className="choice center tone-peach" style={{ border: "none", fontSize: 14 }}><Icon name="dumbbell" size={24} />Workout</Link>
      </div>
      {mindful > 0 && <div className="small muted">{mindful} minutes of breathing, focus and workouts today.</div>}

      <section className="card" aria-label="Water">
        <div className="between">
          <div className="hstack" style={{ fontWeight: 600, gap: 8 }}><span style={{ color: "var(--t-sky-fg)", display: "flex" }}><Icon name="drop" size={18} /></span>Water</div>
          <span className="muted small"><b style={{ color: "var(--ink)", fontSize: 18 }}>{t.water}</b> of {goals.water} glasses</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "space-between" }} role="group" aria-label="Glasses of water">
          {Array.from({ length: Math.max(goals.water, t.water) }, (_, i) => {
            const full = i < t.water;
            return (
              <button key={i} type="button" aria-label={`${i + 1} glass${i ? "es" : ""}`} aria-pressed={full} onClick={() => setWater(full && i + 1 === t.water ? i : i + 1)}
                style={{ width: 36, height: 44, border: "none", background: "transparent", padding: 0 }}>
                <svg width="28" height="34" viewBox="0 0 24 28" aria-hidden="true">
                  <path d="M12 2c3.5 4.6 8 8.4 8 13a8 8 0 0 1-16 0c0-4.6 4.5-8.4 8-13z" fill={full ? "#6FA3CF" : "var(--surf)"} stroke={full ? "var(--t-sky-fg)" : "var(--line)"} strokeWidth="1.6" />
                </svg>
              </button>
            );
          })}
        </div>
        <div className="hstack">
          <button type="button" className="btn sm" onClick={() => setWater(Math.max(0, t.water - 1))} disabled={!t.water}><Icon name="minus" size={16} />Remove</button>
          <button type="button" className="btn sm soft-btn" onClick={() => setWater(t.water + 1)}><Icon name="plus" size={16} />Add a glass</button>
        </div>
      </section>

      <section className="card" aria-label="Sleep">
        <div className="between">
          <div className="hstack" style={{ fontWeight: 600, gap: 8 }}><span style={{ color: "var(--t-sky-fg)", display: "flex" }}><Icon name="bed" size={18} /></span>Sleep last night</div>
          <span className="big-num" style={{ fontSize: 24 }}>{sleepMin ? fmtDur(sleepMin) : "–"}</span>
        </div>
        <TimePair idPrefix="sleep" from={sleepStart} to={sleepEnd} onFrom={setSleepStart} onTo={setSleepEnd} />
        <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }} disabled={!sleepStart || !sleepEnd} onClick={() => save({ sleepStart, sleepEnd }, "Sleep saved")}>Save sleep</button>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }} role="img" aria-label={`Sleep in the last 7 days: ${data.week.map((w) => (w.sleepMin ? fmtDur(w.sleepMin) : "not logged")).join(", ")}`}>
          {data.week.map((w) => (
            <div key={w.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", maxWidth: 26, height: w.sleepMin ? Math.max(6, (w.sleepMin / maxSleep) * 76) : 4, borderRadius: 7, background: w.date === date ? "var(--t-sky-fg)" : "#A9C8E4" }} />
              <span className="muted" style={{ fontSize: 11.5 }}>{parseKey(w.date).toLocaleDateString("en-GB", { weekday: "narrow" })}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid2">
        <section className="card" aria-label="Steps">
          <span style={{ fontWeight: 600 }}>Steps</span>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Ring pct={stepPct} size={88} stroke={9} color="#5E9E86" track="var(--t-sage-bg)"><Icon name="steps" size={22} /></Ring>
          </div>
          <div style={{ textAlign: "center" }}><b>{t.steps.toLocaleString()}</b><div className="muted small">of {goals.steps.toLocaleString()}</div></div>
          <label htmlFor="steps" className="sr">Steps today</label>
          <input id="steps" className="input" inputMode="numeric" placeholder="Steps today" value={steps} onChange={(e) => setSteps(e.target.value.replace(/\D/g, ""))} />
          <button type="button" className="btn sm" onClick={() => save({ steps: Number(steps || 0) }, "Steps saved")}>Save</button>
        </section>
        <section className="card" aria-label="Weight">
          <span style={{ fontWeight: 600 }}>Weight</span>
          <div className="big-num">{t.weight ?? (ws.length ? ws[ws.length - 1].weight : "–")} <span className="muted" style={{ fontFamily: "var(--fb)", fontSize: 14, fontWeight: 500 }}>kg</span></div>
          {ws.length >= 2 && (
            <svg viewBox="0 0 100 36" width="100%" height="40" aria-hidden="true" preserveAspectRatio="none">
              {(() => {
                const min = Math.min(...ws.map((w) => w.weight));
                const max = Math.max(...ws.map((w) => w.weight));
                const pts = ws.map((w, i) => `${(i / (ws.length - 1)) * 100},${max === min ? 18 : 32 - ((w.weight - min) / (max - min)) * 28}`).join(" ");
                return <polyline points={pts} fill="none" stroke="var(--t-peach-fg)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />;
              })()}
            </svg>
          )}
          <div className="muted small">{wChange === null ? "Log a few days to see a trend" : `${wChange > 0 ? "+" : ""}${wChange} kg in 30 days`}</div>
          <label htmlFor="weight" className="sr">Weight in kg</label>
          <input id="weight" className="input" inputMode="decimal" placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))} />
          <button type="button" className="btn sm" onClick={() => save({ weight: weight ? Number(weight) : null }, "Weight saved")}>Save</button>
        </section>
      </div>
      <Toast msg={toast.msg} />
    </main>
  );
}
