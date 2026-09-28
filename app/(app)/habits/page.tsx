"use client";
import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/Icon";
import { Bar, Check, ErrorBox, Header, Loading, Tile, Toast } from "@/components/ui";
import { api, useApi, useToast } from "@/lib/client";
import { CATEGORIES } from "@/lib/catalog";
import { repeatLabel } from "@/lib/habitLogic";
import { timeRange, toKey } from "@/lib/dates";
import type { HabitToday } from "@/lib/types";

export default function HabitsPage() {
  const today = toKey();
  const [cat, setCat] = useState("all");
  const { data, error, loading, reload, setData } = useApi<HabitToday[]>(`/api/habits?today=${today}`);
  const toast = useToast();

  async function setCount(h: HabitToday, count: number) {
    setData((d) => d && d.map((x) => (x._id === h._id ? { ...x, count, done: count >= x.goal } : x)));
    try {
      await api(`/api/habits/${h._id}/log`, { body: { date: today, count } });
      reload();
    } catch (e) {
      toast.show((e as Error).message);
      reload();
    }
  }

  const list = (data ?? []).filter((h) => cat === "all" || h.category === cat);
  const todays = (data ?? []).filter((h) => h.scheduled);

  return (
    <main className="shell">
      <Header
        title="Habits"
        sub={data ? `${todays.filter((h) => h.done).length} of ${todays.length} done today` : undefined}
        right={
          <>
            <Link href="/templates" className="icon-btn" aria-label="Templates"><Icon name="grid" /></Link>
            <Link href="/habits/new" className="icon-btn" aria-label="New habit"><Icon name="plus" /></Link>
          </>
        }
      />
      <div className="hstack">
        <button type="button" className="pill" aria-pressed={cat === "all"} onClick={() => setCat("all")}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c.key} type="button" className="pill" aria-pressed={cat === c.key} onClick={() => setCat(c.key)}><Icon name={c.icon} size={16} />{c.name}</button>
        ))}
      </div>
      {loading && !data ? <Loading /> : error && !data ? <ErrorBox msg={error} retry={reload} /> : (
        <div className="stack">
          {list.map((h) => (
            <div key={h._id} className="card" style={{ gap: 8, padding: "12px 12px 14px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Tile icon={h.icon} tone={h.color} />
                <div className="grow">
                  <div className="row-title"><Link href={`/habits/${h._id}`}>{h.name}</Link></div>
                  <div className="row-meta">{[h.startTime ? timeRange(h.startTime, h.endTime) : "Anytime", repeatLabel(h)].join("  ·  ")}</div>
                </div>
                {!h.scheduled ? (
                  <span className="chip">Not today</span>
                ) : h.goal > 1 ? (
                  <div className="counter">
                    <button type="button" className="icon-btn sm" aria-label={`Remove one from ${h.name}`} onClick={() => setCount(h, Math.max(0, h.count - 1))} disabled={h.count === 0}><Icon name="minus" size={16} /></button>
                    <button type="button" className={`icon-btn sm tone-${h.color}`} style={{ border: "none" }} aria-label={`Add one to ${h.name}`} onClick={() => setCount(h, h.count + 1)}><Icon name={h.done ? "check" : "plus"} size={18} /></button>
                  </div>
                ) : (
                  <Check done={h.done} label={h.name} onClick={() => setCount(h, h.done ? 0 : 1)} />
                )}
              </div>
              {h.goal > 1 && h.scheduled && (
                <>
                  <Bar pct={(h.count / h.goal) * 100} color={`var(--t-${h.color}-fg)`} track={`var(--t-${h.color}-bg)`} />
                  <span className="small muted">{h.count} of {h.goal}{h.unit ? " " + h.unit : ""}</span>
                </>
              )}
              <div className="hstack" style={{ gap: 8 }}>
                <span className="chip tone-honey"><Icon name="flame" size={14} />{h.streak}-{h.streakUnit} streak</span>
                <span className="small muted">Best {h.best}</span>
                {h.repeat === "weekly" && <span className="small muted">{h.weekDone} of {h.timesPerWeek} this week</span>}
              </div>
            </div>
          ))}
          {!list.length && (
            <div className="card empty">
              <span>{cat === "all" ? "You don't have any habits yet." : "No habits in this category."}</span>
              <Link href="/habits/new" className="btn sm primary">New habit</Link>
            </div>
          )}
        </div>
      )}
      <Toast msg={toast.msg} />
    </main>
  );
}
