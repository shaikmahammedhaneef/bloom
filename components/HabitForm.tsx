"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import { Seg, Stepper, TimePair, Toggle } from "./ui";
import { api } from "@/lib/client";
import { CATEGORIES, ICONS, TONES } from "@/lib/catalog";
import { duration, fmtDur, fmtTime, partOfDay, toKey } from "@/lib/dates";
import type { Habit, Repeat } from "@/lib/types";

const DAY_BTNS = [
  { d: 1, l: "M", n: "Monday" }, { d: 2, l: "T", n: "Tuesday" }, { d: 3, l: "W", n: "Wednesday" }, { d: 4, l: "T", n: "Thursday" },
  { d: 5, l: "F", n: "Friday" }, { d: 6, l: "S", n: "Saturday" }, { d: 0, l: "S", n: "Sunday" },
];

export default function HabitForm({ initial }: { initial?: Habit }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "drop");
  const [color, setColor] = useState(initial?.color ?? "sky");
  const [category, setCategory] = useState(initial?.category ?? "health");
  const [from, setFrom] = useState(initial?.startTime ?? "");
  const [to, setTo] = useState(initial?.endTime ?? "");
  const [repeat, setRepeat] = useState<Repeat>(initial?.repeat ?? "daily");
  const [timesPerWeek, setTimes] = useState(initial?.timesPerWeek ?? 3);
  const [days, setDays] = useState<number[]>(initial?.days?.length ? initial.days : [1, 2, 3, 4, 5]);
  const [goal, setGoal] = useState(initial?.goal ?? 1);
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [reminder, setReminder] = useState(initial?.reminder ?? true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dur = duration(from, to);
  const part = partOfDay(from);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Give the habit a name.");
    if (to && !from) return setError("Add a 'from' time before the 'to' time.");
    if (repeat === "days" && !days.length) return setError("Pick at least one day.");
    setBusy(true);
    const body = { name, icon, color, category, startTime: from, endTime: to, repeat, timesPerWeek, days, goal, unit, reminder: reminder && Boolean(from) };
    try {
      if (initial) {
        await api(`/api/habits/${initial._id}`, { method: "PATCH", body });
        router.push(`/habits/${initial._id}`);
      } else {
        await api("/api/habits", { body: { ...body, startDate: toKey() } });
        router.push("/today");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial || !confirm(`Delete “${initial.name}” and all its history? This can't be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/habits/${initial._id}`, { method: "DELETE" });
      router.push("/habits");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="stack-lg" onSubmit={save} noValidate>
      <div className="field">
        <label htmlFor="hname">Name</label>
        <input id="hname" className="input" placeholder="Drink water" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} style={{ fontWeight: 600, fontSize: 17 }} />
      </div>

      <div className="card">
        <div className="between">
          <span className="flabel">When</span>
          <span className="small muted">
            {from ? `${part[0].toUpperCase()}${part.slice(1)} routine${dur ? `, ${fmtDur(dur)}` : ""}` : "No set time — shows under Anytime"}
          </span>
        </div>
        <TimePair idPrefix="habit" from={from} to={to} onFrom={setFrom} onTo={setTo} />
        {(from || to) && (
          <button type="button" className="btn sm ghost" style={{ alignSelf: "flex-start" }} onClick={() => { setFrom(""); setTo(""); }}>Clear times</button>
        )}
      </div>

      <div className="field">
        <span className="flabel">Repeat</span>
        <Seg label="Repeat" value={repeat} onChange={setRepeat} options={[{ value: "daily", label: "Every day" }, { value: "days", label: "Some days" }, { value: "weekly", label: "Times a week" }]} />
        {repeat === "days" && (
          <div style={{ display: "flex", justifyContent: "space-between" }} role="group" aria-label="Days">
            {DAY_BTNS.map((b) => {
              const on = days.includes(b.d);
              return (
                <button key={b.d} type="button" aria-label={b.n} aria-pressed={on} onClick={() => setDays(on ? days.filter((x) => x !== b.d) : [...days, b.d])}
                  style={{ width: 42, height: 42, borderRadius: "50%", border: `1.5px solid ${on ? "var(--acc)" : "var(--line)"}`, background: on ? "var(--acc)" : "var(--surf)", color: on ? "var(--on-acc)" : "var(--ink)", fontWeight: 600 }}>
                  {b.l}
                </button>
              );
            })}
          </div>
        )}
        {repeat === "weekly" && (
          <div className="card" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <span>Times per week</span>
            <Stepper value={timesPerWeek} onChange={setTimes} min={1} max={7} label="times per week" />
          </div>
        )}
      </div>

      <div className="card">
        <div className="between">
          <span className="flabel">Daily goal</span>
          <Stepper value={goal} onChange={setGoal} min={1} max={100} label="goal" />
        </div>
        {goal > 1 && (
          <div className="field">
            <label htmlFor="unit">Unit</label>
            <input id="unit" className="input" placeholder="glasses, pages, minutes" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={20} />
          </div>
        )}
        <span className="small muted">{goal > 1 ? `Tap + each time. Done at ${goal}${unit ? " " + unit : ""}.` : "Done with one tap."}</span>
      </div>

      <div className="field">
        <span className="flabel">Icon</span>
        <div className="grid6" role="group" aria-label="Icon">
          {ICONS.map((n) => (
            <button key={n} type="button" aria-label={`${n} icon`} aria-pressed={icon === n} onClick={() => setIcon(n)} className="choice center" style={{ minHeight: 46, padding: 0, justifyContent: "center" }}>
              <Icon name={n} size={20} />
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="flabel">Color</span>
        <div className="hstack" style={{ gap: 10 }} role="group" aria-label="Color">
          {TONES.map((t) => (
            <button key={t.key} type="button" aria-label={t.name} aria-pressed={color === t.key} onClick={() => setColor(t.key)} className={`tone-${t.key}`}
              style={{ width: 44, height: 44, borderRadius: "50%", border: "none", boxShadow: color === t.key ? "0 0 0 3px var(--surf), 0 0 0 5px var(--ink)" : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={icon} size={18} />
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="flabel">Category</span>
        <div className="hstack">
          {CATEGORIES.map((c) => (
            <button key={c.key} type="button" className="pill" aria-pressed={category === c.key} onClick={() => setCategory(c.key)}><Icon name={c.icon} size={16} />{c.name}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Icon name="bell" />
        <div className="grow">
          <div className="row-title">Reminder</div>
          <div className="row-meta">{from ? `At ${fmtTime(from)}, while Bloom is open` : "Add a 'from' time to get reminders"}</div>
        </div>
        <Toggle on={reminder && Boolean(from)} onChange={(v) => setReminder(v)} label="Reminder" />
      </div>

      {error && <div className="error" role="alert">{error}</div>}
      <button className="btn primary block" disabled={busy}>{busy ? "Saving…" : initial ? "Save changes" : "Save habit"}</button>
      {initial && <button type="button" className="btn danger block" onClick={remove} disabled={busy}><Icon name="trash" size={18} />Delete habit</button>}
    </form>
  );
}
