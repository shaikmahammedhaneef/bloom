"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import MoodTabs from "@/components/MoodTabs";
import { Bar, ErrorBox, Face, Header, Loading } from "@/components/ui";
import { useApi } from "@/lib/client";
import { MOOD_NAMES } from "@/lib/catalog";
import { fmtDay, fmtTime, toKey } from "@/lib/dates";
import type { Mood } from "@/lib/types";

export default function MoodHistoryPage() {
  const today = toKey();
  const [month, setMonth] = useState(today.slice(0, 7));
  const { data, error, loading, reload } = useApi<Mood[]>(`/api/mood?month=${month}`);
  const [picked, setPicked] = useState<string | null>(null);

  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysIn = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  // The calendar shows each day's best check-in.
  const byDate = useMemo(() => {
    const best = new Map<string, Mood>();
    for (const m of data ?? []) {
      const b = best.get(m.date);
      if (!b || m.level > b.level || (m.level === b.level && m.time > b.time)) best.set(m.date, m);
    }
    return best;
  }, [data]);
  const days = [...byDate.values()];
  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setPicked(null);
  };

  const dist = [5, 4, 3, 2, 1].map((l) => ({ l, n: days.filter((d) => d.level === l).length }));
  const emo: Record<string, number> = {};
  (data ?? []).forEach((d) => d.emotions.forEach((e) => (emo[e] = (emo[e] ?? 0) + 1)));
  const topEmo = Object.entries(emo).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const lifts: Record<string, number> = {};
  (data ?? []).filter((d) => d.level >= 4).forEach((d) => d.triggers.forEach((t) => (lifts[t] = (lifts[t] ?? 0) + 1)));
  const topLifts = Object.entries(lifts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const avg = days.length ? days.reduce((a, b) => a + b.level, 0) / days.length : null;
  const sel = picked ? byDate.get(picked) : null;
  const selAll = picked ? (data ?? []).filter((m) => m.date === picked) : [];

  return (
    <main className="shell">
      <Header title="Mood history" small />
      <MoodTabs current="/mood/history" />
      <section className="card" style={{ padding: 12 }} aria-label="Calendar">
        <div className="between">
          <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => shift(-1)}><Icon name="chevL" /></button>
          <span className="h2" style={{ fontSize: 19 }}>{first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
          <button type="button" className="icon-btn" aria-label="Next month" onClick={() => shift(1)}><Icon name="chevR" /></button>
        </div>
        {loading && !data ? <Loading /> : error && !data ? <ErrorBox msg={error} retry={reload} /> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "4px 2px" }}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="muted small" style={{ textAlign: "center" }}>{d}</span>)}
            {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: daysIn }, (_, i) => {
              const k = `${month}-${String(i + 1).padStart(2, "0")}`;
              const md = byDate.get(k);
              const isToday = k === today;
              return (
                <button key={k} type="button" onClick={() => setPicked(md ? k : null)} disabled={!md}
                  aria-label={`${fmtDay(k)}${md ? `, best mood ${MOOD_NAMES[md.level - 1]}` : ", no check-in"}`}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 0", borderRadius: 10, border: picked === k ? "1.5px solid var(--acc)" : "1.5px solid transparent", background: isToday ? "var(--acc-soft)" : "transparent", cursor: md ? "pointer" : "default" }}>
                  <span style={{ fontSize: 11.5, fontWeight: isToday ? 600 : 500 }} className={isToday ? "" : "muted"}>{i + 1}</span>
                  {md ? <Face level={md.level} size={26} /> : <span style={{ width: 26, height: 26, borderRadius: "50%", border: "1.5px dashed var(--line)" }} />}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {sel && (
        <section className="card" aria-live="polite">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Face level={sel.level} size={40} />
            <div className="grow">
              <div className="row-title">{fmtDay(sel.date)}</div>
              <div className="row-meta">Best: {MOOD_NAMES[sel.level - 1]}{selAll.length > 1 ? ` · ${selAll.length} check-ins` : ""}</div>
            </div>
          </div>
          {selAll.map((m) => (
            <div key={m._id} className="stack" style={{ gap: 6, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <div className="hstack" style={{ gap: 8 }}>
                <Face level={m.level} size={24} />
                <span style={{ fontWeight: 600 }}>{MOOD_NAMES[m.level - 1]}</span>
                {m.time && <span className="muted small">{fmtTime(m.time)}</span>}
              </div>
              {m.emotions.length > 0 && <div className="hstack">{m.emotions.map((e) => <span key={e} className="chip">{e}</span>)}</div>}
              {m.triggers.length > 0 && <div className="small muted">Shaped by: {m.triggers.join(", ")}</div>}
              {m.note && <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{m.note}</p>}
            </div>
          ))}
        </section>
      )}

      {data && data.length > 0 ? (
        <>
          <section className="card" aria-label="Days by mood">
            <div className="between"><span style={{ fontWeight: 600 }}>Days by mood</span>{avg && <span className="muted small">Mostly {MOOD_NAMES[Math.round(avg) - 1].toLowerCase()}</span>}</div>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              {dist.map((d) => (
                <div key={d.l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <Face level={d.l} size={30} title /><b style={{ fontSize: 14 }}>{d.n}</b>
                </div>
              ))}
            </div>
          </section>
          {topEmo.length > 0 && (
            <section className="card" aria-label="Most felt emotions">
              <span style={{ fontWeight: 600 }}>Most felt emotions</span>
              {topEmo.map(([e, n]) => (
                <div key={e} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 84, fontSize: 14 }}>{e}</span>
                  <div className="grow"><Bar pct={(n / topEmo[0][1]) * 100} /></div>
                  <span className="muted small" style={{ width: 24, textAlign: "right" }}>{n}</span>
                </div>
              ))}
            </section>
          )}
          {topLifts.length > 0 && (
            <section className="card" aria-label="Lifts your mood">
              <span style={{ fontWeight: 600 }}>On your good days</span>
              <div className="hstack">{topLifts.map(([t, n]) => <span key={t} className="chip tone-sage">{t} · {n}</span>)}</div>
            </section>
          )}
        </>
      ) : data ? (
        <div className="card empty small">No check-ins this month yet.</div>
      ) : null}
    </main>
  );
}
