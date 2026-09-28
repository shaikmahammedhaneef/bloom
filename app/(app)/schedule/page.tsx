"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import TodoForm from "@/components/TodoForm";
import TodoList from "@/components/TodoList";
import { ErrorBox, Header, Loading, SegLinks, Sheet, Toast } from "@/components/ui";
import { useApi, useToast } from "@/lib/client";
import { addDays, fmtHour, fmtLong, fmtTime, nowTime, timeRange, toKey, toMin } from "@/lib/dates";
import type { TodayData } from "@/lib/types";

const PX = 60; // pixels per hour, so 1px per minute
const MIN_MIN = 28; // shortest block drawn, in minutes, so a title always fits

type Block = { id: string; title: string; start: number; end: number; vEnd: number; tone: string; done: boolean; todo: boolean; label: string; lane: number; span: number; lanes: number };

/**
 * Lays out overlapping blocks side by side, like a calendar app: each block
 * gets a lane, and widens into lanes to its right that are free while it runs.
 * Short blocks count as MIN_MIN long, since that's how tall they're drawn.
 */
function layout(input: Omit<Block, "vEnd" | "lane" | "span" | "lanes">[]): Block[] {
  const blocks: Block[] = input
    .map((b) => ({ ...b, vEnd: Math.max(b.end, b.start + MIN_MIN), lane: 0, span: 1, lanes: 1 }))
    .sort((a, b) => a.start - b.start || b.vEnd - a.vEnd);
  const overlaps = (a: Block, b: Block) => a.start < b.vEnd && b.start < a.vEnd;
  let cluster: Block[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const laneEnds: number[] = [];
    for (const b of cluster) {
      let i = laneEnds.findIndex((end) => end <= b.start);
      if (i === -1) i = laneEnds.push(0) - 1;
      laneEnds[i] = b.vEnd;
      b.lane = i;
    }
    for (const b of cluster) {
      b.lanes = laneEnds.length;
      let span = 1;
      while (b.lane + span < b.lanes && !cluster.some((o) => o.lane === b.lane + span && overlaps(o, b))) span++;
      b.span = span;
    }
    cluster = [];
  };
  for (const b of blocks) {
    if (cluster.length && b.start >= clusterEnd) flush();
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.vEnd);
  }
  flush();
  return blocks;
}

export default function SchedulePage() {
  const today = toKey();
  const [date, setDate] = useState(today);
  const { data, error, loading, reload, setData } = useApi<TodayData>(`/api/today?date=${date}`);
  const toast = useToast();
  const [open, setOpen] = useState<Block | null>(null);
  const closeOpen = useCallback(() => setOpen(null), []);
  const [now, setNow] = useState(nowTime());
  useEffect(() => {
    const id = setInterval(() => setNow(nowTime()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { blocks, untimed } = useMemo(() => {
    const bl: Parameters<typeof layout>[0] = [];
    const un: string[] = [];
    const add = (id: string, title: string, start: string, end: string, tone: string, done: boolean, todo: boolean) => {
      const s = toMin(start);
      let e = end ? toMin(end) : s + 30;
      if (e <= s) e = 24 * 60; // runs past midnight: show until the end of the day
      bl.push({ id, title, start: s, end: e, tone, done, todo, label: timeRange(start, end) });
    };
    data?.habits.forEach((h) => (h.startTime ? add(h._id, h.name, h.startTime, h.endTime, h.color, h.done, false) : un.push(h.name)));
    data?.todos.forEach((t) => t.startTime && add(t._id, t.title, t.startTime, t.endTime, "plain", t.done, true));
    return { blocks: layout(bl), untimed: un };
  }, [data]);

  // The timeline covers the whole day; scroll it to now (today) or the first block.
  const scroller = useRef<HTMLDivElement>(null);
  const loaded = Boolean(data);
  const firstStart = blocks[0]?.start;
  useEffect(() => {
    const el = scroller.current;
    if (!el || !loaded) return;
    const target = date === today ? toMin(nowTime()) - 60 : (firstStart ?? 7 * 60) - 30;
    el.scrollTop = Math.max(0, (target / 60) * PX);
  }, [date, today, loaded, firstStart]);


  const hours = Array.from({ length: 25 }, (_, h) => h);
  const top = (min: number) => (min / 60) * PX;
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
            <div className="tl-scroll" ref={scroller}>
              <div className="timeline" style={{ height: 24 * PX + 12 }}>
                {hours.map((h) => (
                  <div key={h}>
                    <div className="tl-hour" style={{ top: h * PX + 6 }}>{fmtHour(h)}</div>
                    <div className="tl-line" style={{ top: h * PX + 6 }} />
                  </div>
                ))}
                {blocks.map((b) => {
                  const h = top(b.vEnd) - top(b.start) - 2;
                  const compact = h < 44;
                  return (
                    <button
                      type="button"
                      key={b.id + b.start}
                      onClick={() => setOpen(b)}
                      className={`tl-block ${b.todo ? "todo" : `tone-${b.tone}`} ${b.done ? "is-done" : ""} ${compact ? "compact" : ""}`}
                      style={{
                        top: top(b.start) + 7,
                        height: h,
                        left: `calc(var(--tl-gutter) + (100% - var(--tl-gutter)) * ${b.lane / b.lanes})`,
                        width: `calc((100% - var(--tl-gutter)) * ${b.span / b.lanes} - 3px)`,
                      }}
                      aria-label={`${b.title}, ${b.label}${b.done ? ", done" : ""}`}
                    >
                      <span className="tl-title">{b.done ? "✓ " : ""}{b.title}</span>
                      <small>{b.label}</small>
                    </button>
                  );
                })}
                {date === today && <div className="tl-now" style={{ top: top(nowMin) + 6 }} aria-label={`Now, ${fmtTime(now)}`} />}
              </div>
            </div>
            {untimed.length > 0 && <div className="muted small">No set time: {untimed.join(", ")}</div>}
          </section>

          <section className="stack" aria-label="To-dos">
            <div className="between">
              <span style={{ fontWeight: 600 }}>To-dos</span>
              <span className="muted small">{data?.todos.filter((t) => t.done).length ?? 0} of {data?.todos.length ?? 0} done</span>
            </div>
            {data && data.todos.length > 0 && (
              <TodoList todos={data.todos} setTodos={(fn) => setData((d) => d && { ...d, todos: fn(d.todos) })} reload={reload} toast={toast.show} />
            )}
            <TodoForm date={date} onAdded={(on) => { toast.show(on === date ? "To-do added" : `To-do added for ${fmtLong(on)}`); reload(); }} />
          </section>
        </>
      )}
      {open && (
        <Sheet title={open.title} onClose={closeOpen}>
          <div className="hstack muted" style={{ gap: 8 }}><Icon name="clock" size={18} />{open.label}</div>
          <div className="muted small">{open.todo ? "To-do" : "Habit"}{open.done ? " · Done" : ""}</div>
          {!open.todo && <Link href={`/habits/${open.id}`} className="btn block">View habit</Link>}
          <button type="button" className="btn ghost block" onClick={closeOpen}>Close</button>
        </Sheet>
      )}
      <Toast msg={toast.msg} />
    </main>
  );
}
