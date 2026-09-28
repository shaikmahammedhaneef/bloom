"use client";
import { useState } from "react";
import { DayPicker, Seg, TimePair, Toggle } from "./ui";
import { api } from "@/lib/client";
import { dow } from "@/lib/dates";
import type { Todo, TodoRepeat } from "@/lib/types";

export type TodoFields = { title: string; startTime: string; endTime: string; reminder: boolean; repeat: TodoRepeat; days: number[] };

/** Adds a to-do on `date`, or edits `initial` when given (then `onSave` does the saving). */
export default function TodoForm({ date, onAdded, initial, onSave, onCancel }: {
  date: string;
  onAdded?: () => void;
  initial?: Todo;
  onSave?: (fields: TodoFields) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
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
    const fields: TodoFields = { title, startTime: from, endTime: to, reminder: reminder && Boolean(from), repeat, days: repeat === "days" ? days : [] };
    setBusy(true);
    try {
      if (onSave) {
        await onSave(fields);
      } else {
        await api("/api/todos", { body: { ...fields, date } });
        setTitle("");
        setFrom("");
        setTo("");
        setReminder(false);
        setRepeat("none");
        onAdded?.();
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
