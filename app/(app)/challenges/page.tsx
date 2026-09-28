"use client";
import { useState } from "react";
import Icon from "@/components/Icon";
import { Check, ErrorBox, Header, Loading, Tile, Toast } from "@/components/ui";
import { api, useApi, useToast } from "@/lib/client";
import { addDays, toKey } from "@/lib/dates";
import type { ChallengeDef, ChallengeView } from "@/lib/types";

export default function ChallengesPage() {
  const today = toKey();
  const { data, error, loading, reload } = useApi<{ catalog: ChallengeDef[]; mine: ChallengeView[] }>(`/api/challenges?today=${today}`);
  const [len, setLen] = useState<7 | 21>(7);
  const toast = useToast();

  const active = data?.mine.filter((c) => c.status === "active") ?? [];
  const finished = data?.mine.filter((c) => c.status !== "active") ?? [];
  const activeKeys = new Set(active.map((c) => c.key));

  async function join(key: string) {
    try {
      await api("/api/challenges", { body: { key, today } });
      toast.show("Challenge started. Day 1 is today");
      reload();
    } catch (e) {
      toast.show((e as Error).message);
    }
  }
  async function mark(c: ChallengeView, date: string, done: boolean) {
    try {
      const r = await api<ChallengeView>(`/api/challenges/${c._id}`, { method: "PATCH", body: { date, done } });
      if (r.status === "completed") toast.show(`You finished ${c.name}. +200 points`);
      reload();
    } catch (e) {
      toast.show((e as Error).message);
    }
  }
  async function leave(c: ChallengeView) {
    if (!confirm(`Leave ${c.name}? Your progress will be lost.`)) return;
    try {
      await api(`/api/challenges/${c._id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      toast.show((e as Error).message);
    }
  }

  return (
    <main className="shell">
      <Header title="Challenges" back="/progress" small />
      {loading && !data ? <Loading /> : error && !data ? <ErrorBox msg={error} retry={reload} /> : data && (
        <>
          {active.map((c) => (
            <section key={c._id} className="card" aria-label={c.name}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Tile icon={c.icon} tone={c.tone} size={48} radius={14} iconSize={24} />
                <div className="grow">
                  <div style={{ fontSize: 17, fontWeight: 600 }}>{c.name}</div>
                  <div className="row-meta">Day {c.day} of {c.days}  ·  {c.doneDates.length} done  ·  +200 pts at the finish</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
                {Array.from({ length: c.days }, (_, i) => {
                  const k = addDays(c.startDate, i);
                  const done = c.doneDates.includes(k);
                  const isToday = k === today;
                  const past = k < today;
                  return (
                    <button key={k} type="button" disabled={k > today} onClick={() => mark(c, k, !done)}
                      aria-label={`Day ${i + 1}${done ? ", done" : past ? ", missed" : ""}`} aria-pressed={done}
                      style={{ height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600,
                        background: done ? "var(--acc)" : isToday ? "var(--surf)" : "var(--bg)", color: done ? "var(--on-acc)" : "var(--muted)",
                        border: isToday ? "2.5px solid var(--acc)" : "none", cursor: k > today ? "default" : "pointer" }}>
                      {done ? <Icon name="check" size={14} stroke={2.4} /> : i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="row" style={{ borderTop: "1px solid var(--line)" }}>
                <div className="grow"><div className="row-title">Today: {c.task}</div><div className="row-meta">Tap a past day to fix it</div></div>
                <Check done={c.doneToday} label={c.task} onClick={() => mark(c, today, !c.doneToday)} />
              </div>
              <button type="button" className="btn sm ghost danger" style={{ alignSelf: "flex-start" }} onClick={() => leave(c)}>Leave challenge</button>
            </section>
          ))}

          <div className="section-title">Start a new challenge</div>
          <div className="hstack">
            <button type="button" className="pill" aria-pressed={len === 7} onClick={() => setLen(7)}>7 days</button>
            <button type="button" className="pill" aria-pressed={len === 21} onClick={() => setLen(21)}>21 days</button>
          </div>
          <div className="stack">
            {data.catalog.filter((c) => c.days === len).map((c) => (
              <div key={c.key} className="card" style={{ padding: "10px 14px" }}>
                <div className="row">
                  <Tile icon={c.icon} tone={c.tone} size={44} />
                  <div className="grow"><div className="row-title">{c.name}</div><div className="row-meta">{c.task}. {c.desc}</div></div>
                  {activeKeys.has(c.key) ? <span className="chip tone-sage">Joined</span> : <button type="button" className="btn sm" onClick={() => join(c.key)}>Join</button>}
                </div>
              </div>
            ))}
          </div>

          {finished.length > 0 && (
            <>
              <div className="section-title">Past challenges</div>
              <div className="card list">
                {finished.map((c) => (
                  <div key={c._id} className="row">
                    <Tile icon={c.status === "completed" ? "trophy" : c.icon} tone={c.status === "completed" ? "honey" : "plain"} size={36} iconSize={18} />
                    <div className="grow"><div className="row-title">{c.name}</div><div className="row-meta">{c.status === "completed" ? "Finished" : `Ended with ${c.doneDates.length} of ${c.days} days`}</div></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
      <Toast msg={toast.msg} />
    </main>
  );
}
