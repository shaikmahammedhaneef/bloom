"use client";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import HabitRow from "@/components/HabitRow";
import TodoList from "@/components/TodoList";
import { ErrorBox, Face, Loading, Ring, Sheet, SwipeRow, Toast } from "@/components/ui";
import { useMe } from "@/components/AppShell";
import { api, useApi, useToast } from "@/lib/client";
import { fmtLong, greeting, partOfDay, toKey, type Part } from "@/lib/dates";
import type { HabitToday, TodayData } from "@/lib/types";

const PARTS: { key: Part; label: string; icon: string }[] = [
  { key: "morning", label: "Morning", icon: "sun" },
  { key: "afternoon", label: "Afternoon", icon: "sunset" },
  { key: "evening", label: "Evening", icon: "moon" },
  { key: "anytime", label: "Anytime", icon: "clock" },
];

export default function TodayPage() {
  const [date] = useState(toKey());
  const { me } = useMe();
  const { data, error, loading, reload, setData } = useApi<TodayData>(`/api/today?date=${date}`);
  const toast = useToast();
  const router = useRouter();
  const [deleting, setDeleting] = useState<HabitToday | null>(null);
  const closeDelete = useCallback(() => setDeleting(null), []);

  const groups = useMemo(() => {
    const g: Record<Part, HabitToday[]> = { morning: [], afternoon: [], evening: [], anytime: [] };
    data?.habits.forEach((h) => g[partOfDay(h.startTime)].push(h));
    return g;
  }, [data]);

  if (loading && !data) return <main className="shell"><Loading /></main>;
  if (error && !data) return <main className="shell"><ErrorBox msg={error} retry={reload} /></main>;
  if (!data) return null;

  const total = data.habits.length;
  const done = data.habits.filter((h) => h.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const topStreak = Math.max(0, ...data.habits.filter((h) => h.streakUnit === "day").map((h) => h.streak));

  async function removeHabit(h: HabitToday) {
    setDeleting(null);
    try {
      await api(`/api/habits/${h._id}`, { method: "DELETE" });
      setData((d) => d && { ...d, habits: d.habits.filter((x) => x._id !== h._id) });
      toast.show(`${h.name} deleted`);
      reload();
    } catch (e) {
      toast.show((e as Error).message);
    }
  }

  async function setCount(h: HabitToday, count: number) {
    const before = data;
    setData((d) => d && { ...d, habits: d.habits.map((x) => (x._id === h._id ? { ...x, count, done: count >= x.goal } : x)) });
    try {
      await api(`/api/habits/${h._id}/log`, { body: { date, count } });
      if (count >= h.goal && h.count < h.goal) toast.show(`Nice — ${h.name} done. +10 points`);
      reload();
    } catch (e) {
      setData(before);
      toast.show((e as Error).message);
    }
  }

  return (
    <main className="shell">
      <header style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="grow">
          <div className="muted" style={{ fontSize: 14 }}>{fmtLong(date)}</div>
          <h1 className="h1" style={{ fontSize: 28 }}>{greeting()}{me?.name ? `, ${me.name}` : ""}</h1>
        </div>
        <Link href="/week" className="icon-btn" aria-label="Week view"><Icon name="cal" /></Link>
        <Link href="/profile" className="icon-btn tone-peach" style={{ borderRadius: "50%", border: "none" }} aria-label="Your profile"><Icon name="user" /></Link>
      </header>

      <section className="card" aria-label="Today's progress">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Ring pct={pct}>
            <span className="big-num" style={{ fontSize: 24 }}>{pct}%</span>
            <span className="muted" style={{ fontSize: 11.5 }}>done</span>
          </Ring>
          <div className="stack" style={{ gap: 8 }}>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{total ? `${done} of ${total} habits done` : "No habits planned today"}</div>
            <div className="hstack" style={{ gap: 6 }}>
              {topStreak > 0 && <span className="chip tone-honey"><Icon name="flame" size={14} />{topStreak}-day streak</span>}
              <span className="chip tone-lilac"><Icon name="star" size={14} />{data.points} pts</span>
            </div>
            <Link href="/schedule" style={{ fontWeight: 600, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 2, minHeight: 32 }}>
              View schedule <Icon name="chevR" size={14} />
            </Link>
          </div>
        </div>
      </section>

      {me?.roleModel && (
        <div className="soft" style={{ flexDirection: "row", alignItems: "center", gap: 10, background: "var(--t-peach-bg)", color: "var(--t-peach-fg)" }}>
          <Icon name="flag" size={18} />
          <span style={{ fontSize: 14, color: "var(--ink)" }}>Becoming: {me.roleModel}</span>
        </div>
      )}

      {!data.mood ? (
        <Link href="/mood" className="soft" style={{ flexDirection: "row", alignItems: "center", gap: 12, background: "var(--t-lilac-bg)", color: "var(--t-lilac-fg)" }}>
          <span style={{ display: "flex" }}><Face level={3} size={30} /><span style={{ marginLeft: -8, display: "flex" }}><Face level={4} size={30} /></span><span style={{ marginLeft: -8, display: "flex" }}><Face level={5} size={30} /></span></span>
          <span className="grow" style={{ fontWeight: 600 }}>How are you feeling today?</span>
          <span style={{ fontWeight: 600, display: "flex", alignItems: "center" }}>Check in <Icon name="chevR" size={14} /></span>
        </Link>
      ) : (
        <Link href="/mood" className="soft" style={{ flexDirection: "row", alignItems: "center", gap: 12, background: "var(--t-lilac-bg)", color: "var(--t-lilac-fg)" }}>
          <Face level={data.mood.level} size={30} />
          <span className="grow" style={{ fontWeight: 600 }}>{data.moodCount > 1 ? `${data.moodCount} check-ins today` : "Mood checked in"}</span>
          <span style={{ fontWeight: 600, display: "flex", alignItems: "center" }}>Check in again <Icon name="chevR" size={14} /></span>
        </Link>
      )}

      {total === 0 && (
        <div className="card empty">
          <span>Plan your day with a routine or your own habit.</span>
          <div className="hstack" style={{ justifyContent: "center" }}>
            <Link href="/templates" className="btn sm">Browse templates</Link>
            <Link href="/habits/new" className="btn sm primary">New habit</Link>
          </div>
        </div>
      )}

      {PARTS.map((p) =>
        groups[p.key].length ? (
          <section key={p.key} className="stack" style={{ gap: 6 }} aria-label={p.label}>
            <div className="hstack muted" style={{ gap: 8 }}>
              <Icon name={p.icon} size={18} />
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>{p.label}</span>
            </div>
            <div className="card list">
              {groups[p.key].map((h) => (
                <SwipeRow key={h._id} label={h.name} actions={[
                  { label: "View", icon: "chart", onClick: () => router.push(`/habits/${h._id}`) },
                  { label: "Edit", icon: "pen", onClick: () => router.push(`/habits/${h._id}/edit`) },
                  { label: "Delete", icon: "trash", tone: "danger", onClick: () => setDeleting(h) },
                ]}>
                  <HabitRow h={h} onSet={(c) => setCount(h, c)} />
                </SwipeRow>
              ))}
            </div>
          </section>
        ) : null
      )}

      <section className="stack" style={{ gap: 6 }} aria-label="To-dos">
        <div className="between">
          <span style={{ fontWeight: 600 }}>To-dos</span>
          <Link href="/schedule" style={{ fontWeight: 600, fontSize: 14 }}>Add or edit</Link>
        </div>
        {data.todos.length ? (
          <TodoList todos={data.todos} setTodos={(fn) => setData((d) => d && { ...d, todos: fn(d.todos) })} reload={reload} toast={toast.show} />
        ) : (
          <div className="card empty small">Nothing on your to-do list today.</div>
        )}
      </section>

      <Link href="/habits/new" className="fab" aria-label="Add a habit"><Icon name="plus" size={26} stroke={2.2} /></Link>
      {deleting && (
        <Sheet title="Delete habit?" onClose={closeDelete}>
          <p className="muted" style={{ margin: 0 }}>“{deleting.name}” and all its history will be deleted. This can’t be undone.</p>
          <button type="button" className="btn danger block" onClick={() => removeHabit(deleting)}>Delete habit</button>
          <button type="button" className="btn ghost block" onClick={closeDelete}>Cancel</button>
        </Sheet>
      )}
      <Toast msg={toast.msg} />
    </main>
  );
}
