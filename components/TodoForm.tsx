"use client";
import { useState } from "react";
import { TimePair, Toggle } from "./ui";
import { api } from "@/lib/client";

export default function TodoForm({ date, onAdded }: { date: string; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reminder, setReminder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Write what you need to do.");
    if (to && !from) return setError("Add a 'from' time before the 'to' time.");
    setBusy(true);
    try {
      await api("/api/todos", { body: { title, date, startTime: from, endTime: to, reminder: reminder && Boolean(from) } });
      setTitle("");
      setFrom("");
      setTo("");
      setReminder(false);
      onAdded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={add} noValidate>
      <div className="field">
        <label htmlFor="todo-title">New to-do</label>
        <input id="todo-title" className="input" placeholder="Call the bank" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <TimePair idPrefix="todo" from={from} to={to} onFrom={setFrom} onTo={setTo} />
      <div className="between">
        <span className="small muted">Remind me at the start time</span>
        <Toggle on={reminder} onChange={setReminder} label="Remind me" />
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      <button className="btn primary" disabled={busy}>{busy ? "Adding…" : "Add to-do"}</button>
    </form>
  );
}
