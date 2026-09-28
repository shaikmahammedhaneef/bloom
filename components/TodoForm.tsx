"use client";
import { useState } from "react";
import { DayPicker, Seg, TimePair, Toggle } from "./ui";
import { api } from "@/lib/client";
import { dow } from "@/lib/dates";
import type { Todo, TodoRepeat } from "@/lib/types";

export type TodoFields = { title: string; date: string; endDate: string; startTime: string; endTime: string; reminder: boolean; repeat: TodoRepeat; days: number[] };

/** Adds a to-do (starting on `date` unless the user picks another day), or edits `initial` (then `onSave` saves). */
export default function TodoForm({ date, onAdded, initial, onSave, onCancel }: {
  date: string;
  onAdded?: (on: string) => void;
  initial?: Todo;
  onSave?: (fields: TodoFields) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  // A repeating to-do keeps its first day; a one-off can move to another day.
  const [day, setDay] = useState(initial ? (initial.repeat === "none" ? initial.startDate : initial.date) : date);
  const [until, setUntil] = useState(initial?.endDate ?? "");
  const [pickedDay, setPickedDay] = useState(false);
  if (!initial && !pickedDay && day !== date) setDay(date); // follow the day being viewed until the user picks one
  const [from, setFrom] = useState(initial?.startTime ?? "");
  const [to, setTo] = useState(initial?.endTime ?? "");
  const [reminder, setReminder] = useState(initial?.reminder ?? false);
  const [repeat, setRepeat] = useState<TodoRepeat>(initial?.repeat ?? "none");
  const [days, setDays] = useState<number[]>(initial?.days?.length ? initial.days : [dow(date)]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const idPrefix = initial ? "todo-edit" : "todo";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Write what you need to do.");
    if (to && !from) return setError("Add a 'from' time before the 'to' time.");
    if (repeat === "days" && !days.length) return setError("Pick at least one day.");
    if (!day) return setError("Pick a date.");
    const start = initial && initial.repeat !== "none" ? initial.startDate : day;
    if (until && until < start) return setError("The end date can't be before the start date.");
    const fields: TodoFields = { title, date: day, endDate: until, startTime: from, endTime: to, reminder: reminder && Boolean(from), repeat, days: repeat === "days" ? days : [] };
    setBusy(true);
    try {
      if (onSave) {
        await onSave(fields);
      } else {
        await api("/api/todos", { body: fields });
        setTitle("");
        setFrom("");
        setTo("");
        setUntil("");
        setReminder(false);
        setRepeat("none");
        setPickedDay(false);
        onAdded?.(day);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={initial ? "stack" : "card"} style={initial ? { gap: 14 } : undefined} onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor={`${idPrefix}-title`}>{initial ? "To-do" : "New to-do"}</label>
        <input id={`${idPrefix}-title`} className="input" placeholder="Call the bank" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="time-pair">
        {!(initial && initial.repeat !== "none") && (
          <div className="field">
            <label htmlFor={`${idPrefix}-date`}>{repeat === "none" ? "Date" : "Starts"}</label>
            <input id={`${idPrefix}-date`} type="date" className="input" value={day} required onChange={(e) => { setDay(e.target.value); setPickedDay(true); }} />
          </div>
        )}
        <div className="field">
          <label htmlFor={`${idPrefix}-until`}>{repeat === "none" ? "Until (for several days)" : "Repeat until"}</label>
          <input id={`${idPrefix}-until`} type="date" className="input" value={until} min={day} onChange={(e) => setUntil(e.target.value)} />
        </div>
      </div>
      <TimePair idPrefix={idPrefix} from={from} to={to} onFrom={setFrom} onTo={setTo} />
      <div className="field">
        <span className="flabel">Repeat</span>
        <Seg label="Repeat" value={repeat} onChange={setRepeat} options={[{ value: "none", label: "Once" }, { value: "daily", label: "Every day" }, { value: "days", label: "Some days" }]} />
        {repeat === "days" && <DayPicker days={days} onChange={setDays} />}
      </div>
      <div className="between">
        <span className="small muted">Remind me at the start time</span>
        <Toggle on={reminder} onChange={setReminder} label="Remind me" />
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      <div className="hstack">
        <button className="btn primary grow" disabled={busy}>{busy ? "Saving…" : initial ? "Save" : "Add to-do"}</button>
        {onCancel && <button type="button" className="btn" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
