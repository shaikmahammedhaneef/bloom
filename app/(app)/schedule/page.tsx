"use client";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import TodoForm from "@/components/TodoForm";
import TodoRow from "@/components/TodoRow";
import { ErrorBox, Header, Loading, SegLinks, Toast } from "@/components/ui";
import { api, useApi, useToast } from "@/lib/client";
import { addDays, fmtLong, nowTime, timeRange, toKey, toMin } from "@/lib/dates";
import type { TodayData } from "@/lib/types";

const PX = 44; // pixels per hour

type Block = { id: string; title: string; start: number; end: number; tone: string; done: boolean; todo: boolean; label: string; lane?: number; lanes?: number };

function layout(blocks: Block[]) {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.end - a.end);
  let cluster: Block[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes: number[] = [];
    for (const b of cluster) {
      let i = lanes.findIndex((end) => end <= b.start);
      if (i === -1) {
        i = lanes.length;
        lanes.push(0);
      }
      lanes[i] = b.end;
      b.lane = i;
    }
    cluster.forEach((b) => (b.lanes = lanes.length));
    cluster = [];
  };
  for (const b of sorted) {
    if (cluster.length && b.start >= clusterEnd) flush();
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.end);
  }
  flush();
  return sorted;
}

export default function SchedulePage() {
  const today = toKey();
  const [date, setDate] = useState(today);
  const { data, error, loading, reload, setData } = useApi<TodayData>(`/api/today?date=${date}`);
  const toast = useToast();
  const [now, setNow] = useState(nowTime());
  useEffect(() => {
    const id = setInterval(() => setNow(nowTime()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { blocks, untimed, startHour, endHour } = useMemo(() => {
    const bl: Block[] = [];
    const un: string[] = [];
    data?.habits.forEach((h) => {
      if (!h.startTime) return un.push(h.name);
      const s = toMin(h.startTime);
      let e = h.endTime ? toMin(h.endTime) : s + 30;
      if (e <= s) e = 24 * 60;
      bl.push({ id: h._id, title: h.name, start: s, end: e, tone: h.color, done: h.done, todo: false, label: timeRange(h.startTime, h.endTime) });
    });
    data?.todos.forEach((t) => {
      if (!t.startTime) return;
      const s = toMin(t.startTime);
      let e = t.endTime ? toMin(t.endTime) : s + 30;
      if (e <= s) e = 24 * 60;
      bl.push({ id: t._id, title: t.title, start: s, end: e, tone: "plain", done: t.done, todo: true, label: timeRange(t.startTime, t.endTime) });
    });
    const minS = Math.min(6 * 60, ...bl.map((b) => b.start));
    const maxE = Math.max(22 * 60, ...bl.map((b) => b.end));
    return { blocks: layout(bl), untimed: un, startHour: Math.floor(minS / 60), endHour: Math.min(24, Math.ceil(maxE / 60)) };
  }, [data]);

  async function toggleTodo(id: string, done: boolean) {
    setData((d) => d && { ...d, todos: d.todos.map((t) => (t._id === id ? { ...t, done } : t)) });
    try {
      await api(`/api/todos/${id}`, { method: "PATCH", body: { done } });
    } catch (e) {
      toast.show((e as Error).message);
      reload();
    }
  }
  async function del(id: string) {
    try {
      await api(`/api/todos/${id}`, { method: "DELETE" });
      toast.show("To-do deleted");
      reload();
    } catch (e) {
      toast.show((e as Error).message);
    }
  }

  const hours = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);
  const top = (min: number) => (min / 60 - startHour) * PX;
  const nowMin = toMin(now);

  return (
    <main className="shell">
      <Header
        title="Schedule"
        sub={date === today ? `Today, ${fmtLong(date)}` : fmtLong(date)}
        back="/today"
        small
        right={
          <>
            <button type="button" className="icon-btn" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}><Icon name="chevL" /></button>
            <button type="button" className="icon-btn" aria-label="Next day" onClick={() => setDate(addDays(date, 1))}><Icon name="chevR" /></button>
          </>
        }
      />
      <SegLinks items={[{ href: "/schedule", label: "Day" }, { href: "/week", label: "Week" }]} current="/schedule" />

      {loading && !data ? <Loading /> : error && !data ? <ErrorBox msg={error} retry={reload} /> : (
        <>
          <section className="card" aria-label="Time blocks" style={{ padding: "18px 14px 12px" }}>
            {blocks.length === 0 && <div className="muted small">Nothing with a from–to time on this day yet.</div>}
            <div className="timeline" style={{ height: (endHour - startHour) * PX + 4 }}>
              {hours.map((h) => (
                <div key={h}>
                  <div className="tl-hour" style={{ top: (h - startHour) * PX }}>{String(h).padStart(2, "0")}:00</div>
                  <div className="tl-line" style={{ top: (h - startHour) * PX }} />
                </div>
              ))}
              {blocks.map((b) => {
                const w = 100 / (b.lanes ?? 1);
                const h = Math.max(22, top(b.end) - top(b.start) - 2);
                return (
                  <div
                    key={b.id}
                    className={`tl-block ${b.todo ? "todo" : `tone-${b.tone}`} ${b.done ? "is-done" : ""}`}
                    style={{ top: top(b.start) + 1, height: h, left: `calc(58px + (100% - 58px) * ${((b.lane ?? 0) * w) / 100})`, width: `calc((100% - 58px) * ${w / 100} - 3px)` }}
                    title={`${b.title}, ${b.label}`}
                  >
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.done ? "✓ " : ""}{b.title}</span>
                    {h >= 38 && <small>{b.label}</small>}
                  </div>
                );
              })}
              {date === today && nowMin >= startHour * 60 && nowMin <= endHour * 60 && (
                <div className="tl-now" style={{ top: top(nowMin) }} aria-label={`Now, ${now}`} />
              )}
            </div>
            {untimed.length > 0 && <div className="muted small">No set time: {untimed.join(", ")}</div>}
          </section>

          <section className="stack" aria-label="To-dos">
            <div className="between">
              <span style={{ fontWeight: 600 }}>To-dos</span>
              <span className="muted small">{data?.todos.filter((t) => t.done).length ?? 0} of {data?.todos.length ?? 0} done</span>
            </div>
            {data && data.todos.length > 0 && (
              <div className="card list">
                {data.todos.map((t) => <TodoRow key={t._id} t={t} onToggle={() => toggleTodo(t._id, !t.done)} onDelete={() => del(t._id)} />)}
              </div>
            )}
            <TodoForm date={date} onAdded={() => { toast.show("To-do added"); reload(); }} />
          </section>
        </>
      )}
      <Toast msg={toast.msg} />
    </main>
  );
}
