"use client";
import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/Icon";
import { ErrorBox, Header, Loading, SegLinks } from "@/components/ui";
import { useApi } from "@/lib/client";
import { addDays, fmtShort, parseKey, timeRange, toKey, weekStart } from "@/lib/dates";

type WeekData = {
  start: string;
  days: {
    date: string;
    pct: number | null;
    habits: { _id: string; name: string; color: string; startTime: string; endTime: string; done: boolean }[];
    todos: { _id: string; title: string; startTime: string; endTime: string; done: boolean }[];
  }[];
};

export default function WeekPage() {
  const today = toKey();
  const [start, setStart] = useState(weekStart(today));
  const { data, error, loading, reload } = useApi<WeekData>(`/api/week?start=${start}&today=${today}`);

  return (
    <main className="shell">
      <Header
        title="Week"
        sub={`${fmtShort(start)} – ${fmtShort(addDays(start, 6))}`}
        back="/today"
        small
        right={
          <>
            <button type="button" className="icon-btn" aria-label="Previous week" onClick={() => setStart(addDays(start, -7))}><Icon name="chevL" /></button>
            <button type="button" className="icon-btn" aria-label="Next week" onClick={() => setStart(addDays(start, 7))}><Icon name="chevR" /></button>
          </>
        }
      />
      <SegLinks items={[{ href: "/schedule", label: "Day" }, { href: "/week", label: "Week" }]} current="/week" />
      {loading && !data ? <Loading /> : error && !data ? <ErrorBox msg={error} retry={reload} /> : data && (
        <>
          <div className="card" style={{ flexDirection: "row", gap: 4, padding: 8 }}>
            {data.days.map((d) => {
              const isToday = d.date === today;
              return (
                <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 0", borderRadius: 14, background: isToday ? "var(--acc)" : "transparent", color: isToday ? "var(--on-acc)" : "var(--ink)" }}>
                  <span style={{ fontSize: 12, opacity: isToday ? 1 : 0.7 }}>{parseKey(d.date).toLocaleDateString("en-GB", { weekday: "narrow" })}</span>
                  <span style={{ fontWeight: 600 }}>{parseKey(d.date).getDate()}</span>
                  <span style={{ fontSize: 11 }}>{d.pct === null ? " " : `${d.pct}%`}</span>
                </div>
              );
            })}
          </div>
          <div className="stack" style={{ gap: 0 }}>
            {data.days.map((d) => (
              <section key={d.date} style={{ display: "flex", gap: 12, padding: "14px 0", borderTop: "1px solid var(--line)" }} aria-label={fmtShort(d.date)}>
                <div style={{ width: 48, flexShrink: 0 }}>
                  <div className="muted small">{parseKey(d.date).toLocaleDateString("en-GB", { weekday: "short" })}</div>
                  <div className="big-num" style={{ fontSize: 22 }}>{parseKey(d.date).getDate()}</div>
                </div>
                <div className="grow stack" style={{ gap: 8 }}>
                  <div className="small" style={{ fontWeight: 600, color: d.pct !== null ? "var(--acc)" : "var(--muted)" }}>
                    {d.pct !== null ? `${d.pct}% done` : `${d.habits.length + d.todos.length} planned`}
                  </div>
                  <div className="stack" style={{ gap: 6, alignItems: "flex-start" }}>
                    {/* Habits and to-dos together, in time order; untimed ones last. */}
                    {[
                      ...d.habits.map((h) => ({ key: h._id, start: h.startTime, end: h.endTime, name: h.name, done: h.done, tone: h.color as string | null })),
                      ...d.todos.map((t) => ({ key: t._id, start: t.startTime, end: t.endTime, name: t.title, done: t.done, tone: null })),
                    ]
                      .sort((x, y) => (x.start || "99").localeCompare(y.start || "99") || (x.tone === null ? 1 : 0) - (y.tone === null ? 1 : 0))
                      .map((x) => (
                        <span key={x.key} className="chip"
                          style={{
                            ...(x.tone ? { background: `var(--t-${x.tone}-bg)`, color: `var(--t-${x.tone}-fg)` } : { border: "1px dashed var(--muted)" }),
                            textDecoration: x.done ? "line-through" : undefined,
                          }}>
                          {x.start && <span style={{ fontWeight: 500 }}>{timeRange(x.start, x.end)}</span>} {x.name}
                        </span>
                      ))}
                    {!d.habits.length && !d.todos.length && <span className="muted small">Free day</span>}
                  </div>
                </div>
              </section>
            ))}
          </div>
          <Link href="/templates" className="btn block">Add a routine from templates</Link>
        </>
      )}
    </main>
  );
}
