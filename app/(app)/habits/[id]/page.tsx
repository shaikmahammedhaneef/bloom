"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import Icon from "@/components/Icon";
import { ErrorBox, Header, Loading, Tile, Toast } from "@/components/ui";
import { api, useApi, useToast } from "@/lib/client";
import { CATEGORIES } from "@/lib/catalog";
import { isScheduled, repeatLabel } from "@/lib/habitLogic";
import { addDays, duration, fmtDur, parseKey, timeRange, toKey, weekStart } from "@/lib/dates";
import type { Habit } from "@/lib/types";

type Detail = { habit: Habit; counts: Record<string, number>; streak: number; best: number; streakUnit: string; rate: number | null; totalDone: number };

const WEEKS = 16;

export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const today = toKey();
  const { data, error, loading, reload } = useApi<Detail>(`/api/habits/${id}?today=${today}`);
  const toast = useToast();

  if (loading && !data) return <main className="shell"><Loading /></main>;
  if (error && !data) return <main className="shell"><Header title="Habit" back="/habits" small /><ErrorBox msg={error} retry={reload} /></main>;
  if (!data) return null;
  const { habit: h, counts } = data;
  const goal = Math.max(1, h.goal);
  const level = (k: string) => {
    const c = counts[k] ?? 0;
    if (!c) return 0;
    return c >= goal ? 4 : Math.max(1, Math.ceil((c / goal) * 3));
  };
  const first = addDays(weekStart(today), -(WEEKS - 1) * 7);
  const cols = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
  const thisWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart(today), i));
  const todayCount = counts[today] ?? 0;
  const dur = duration(h.startTime, h.endTime);
  const cat = CATEGORIES.find((c) => c.key === h.category);

  async function log(count: number) {
    try {
      await api(`/api/habits/${h._id}/log`, { body: { date: today, count } });
      if (count >= goal) toast.show("Logged for today");
      reload();
    } catch (e) {
      toast.show((e as Error).message);
    }
  }

  return (
    <main className="shell">
      <Header title={h.name} back="/habits" small right={<Link href={`/habits/${h._id}/edit`} className="icon-btn" aria-label="Edit habit"><Icon name="pen" /></Link>} />
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Tile icon={h.icon} tone={h.color} size={52} radius={16} iconSize={24} />
        <div className="hstack" style={{ gap: 6 }}>
          {cat && <span className={`chip tone-${h.color}`}><Icon name={cat.icon} size={14} />{cat.name}</span>}
          <span className="chip"><Icon name="clock" size={14} />{h.startTime ? `${timeRange(h.startTime, h.endTime)}${dur ? ` (${fmtDur(dur)})` : ""}` : "Anytime"}</span>
          <span className="chip"><Icon name="cal" size={14} />{repeatLabel(h)}</span>
          {h.goal > 1 && <span className="chip"><Icon name="target" size={14} />{h.goal} {h.unit}</span>}
          {h.reminder && h.startTime && <span className="chip"><Icon name="bell" size={14} />Reminder {h.startTime}</span>}
        </div>
      </div>
      <div className="grid3">
        <div className="stat"><b>{data.streak}</b><span>Current streak ({data.streakUnit}s)</span></div>
        <div className="stat"><b>{data.best}</b><span>Best streak</span></div>
        <div className="stat"><b>{data.rate === null ? "–" : `${data.rate}%`}</b><span>Last 30 days</span></div>
      </div>

      <section className="card" aria-label="History">
        <div className="between"><span style={{ fontWeight: 600 }}>Last {WEEKS} weeks</span><span className="muted small">{data.totalDone} times in total</span></div>
        <div style={{ overflowX: "auto" }}>
          <div className="heat" role="img" aria-label={`Completion over the last ${WEEKS} weeks`}>
            <div className="heat-col" style={{ width: 16 }}>
              {["M", "", "W", "", "F", "", "S"].map((l, i) => <span key={i} style={{ height: 15, fontSize: 10.5, lineHeight: "15px" }} className="muted">{l}</span>)}
            </div>
            {cols.map((col, i) => (
              <div key={i} className="heat-col">
                {col.map((k) => {
                  const future = k > today;
                  const off = !future && !isScheduled(h, k);
                  return (
                    <span key={k} className="heat-cell" title={`${k}: ${counts[k] ?? 0}`}
                      style={future ? { background: "transparent" } : off ? { opacity: 0.35 } : { background: `var(--heat-${level(k)})` }} />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="hstack muted small" style={{ justifyContent: "flex-end", gap: 4 }}>
          Less {[0, 1, 2, 3, 4].map((l) => <span key={l} className="heat-cell" style={{ width: 12, height: 12, background: `var(--heat-${l})` }} />)} More
        </div>
      </section>

      <section className="card" aria-label="This week">
        <span style={{ fontWeight: 600 }}>This week</span>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {thisWeek.map((k) => {
            const done = (counts[k] ?? 0) >= goal;
            const sched = isScheduled(h, k);
            return (
              <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span className="muted small">{parseKey(k).toLocaleDateString("en-GB", { weekday: "narrow" })}</span>
                <span style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? "var(--acc)" : "transparent", color: "var(--on-acc)", border: done ? "none" : `2px ${sched ? "dashed" : "dotted"} var(--line)`, outline: k === today ? "2px solid var(--acc)" : "none", outlineOffset: 2 }}>
                  {done && <Icon name="check" size={16} stroke={2.4} />}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div style={{ display: "flex", gap: 10 }}>
        {h.goal > 1 ? (
          <>
            <button type="button" className="btn" style={{ flex: 1 }} onClick={() => log(Math.max(0, todayCount - 1))} disabled={!todayCount}><Icon name="minus" size={18} /></button>
            <button type="button" className="btn primary" style={{ flex: 3 }} onClick={() => log(todayCount + 1)}>
              <Icon name="plus" size={18} />Add one ({todayCount} of {h.goal})
            </button>
          </>
        ) : (
          <button type="button" className={`btn block ${todayCount ? "" : "primary"}`} onClick={() => log(todayCount ? 0 : 1)}>
            <Icon name="check" size={18} />{todayCount ? "Done today. Undo" : "Mark done today"}
          </button>
        )}
      </div>
      {(h.icon === "wind" || h.icon === "target") && <Link href="/health/timer" className="btn block"><Icon name="play" size={18} />Start a timer</Link>}
      <Toast msg={toast.msg} />
    </main>
  );
}
