"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import MoodTabs from "@/components/MoodTabs";
import { Face, Header, Toast } from "@/components/ui";
import { api, useToast } from "@/lib/client";
import { EMOTIONS, MOOD_NAMES, TRIGGERS } from "@/lib/catalog";
import { fmtLong, fmtTime, nowTime, toKey } from "@/lib/dates";
import type { Mood } from "@/lib/types";

export default function MoodPage() {
  const date = toKey();
  const [today, setToday] = useState<Mood[]>([]);
  const [editing, setEditing] = useState<Mood | null>(null);
  const [level, setLevel] = useState(0);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const top = useRef<HTMLElement>(null);

  const load = useCallback(() => api<Mood[]>(`/api/mood?date=${date}`).then(setToday).catch(() => {}), [date]);
  useEffect(() => {
    load();
  }, [load]);

  function reset() {
    setEditing(null);
    setLevel(0);
    setEmotions([]);
    setTriggers([]);
    setNote("");
    setError(null);
  }
  function edit(m: Mood) {
    setEditing(m);
    setLevel(m.level);
    setEmotions(m.emotions);
    setTriggers(m.triggers);
    setNote(m.note);
    setError(null);
    top.current?.scrollIntoView({ behavior: "smooth" });
  }

  const flip = (list: string[], v: string, set: (x: string[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function save() {
    setError(null);
    if (!level) return setError("Pick how you feel first.");
    setBusy(true);
    try {
      const body = { level, emotions, triggers, note };
      if (editing?._id) {
        await api(`/api/mood/${editing._id}`, { method: "PATCH", body });
        toast.show("Check-in updated");
      } else {
        await api("/api/mood", { body: { ...body, date, time: nowTime() } });
        toast.show(today.length ? "Check-in saved" : "Check-in saved. +5 points");
      }
      reset();
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(m: Mood) {
    if (!m._id || !window.confirm("Delete this check-in?")) return;
    try {
      await api(`/api/mood/${m._id}`, { method: "DELETE" });
      if (editing?._id === m._id) reset();
      toast.show("Check-in deleted");
      load();
    } catch (e) {
      toast.show((e as Error).message);
    }
  }

  return (
    <main className="shell">
      <Header title="How are you feeling?" sub={fmtLong(date)} small />
      <MoodTabs current="/mood" />
      <section ref={top} className="stack" aria-label={editing ? "Edit check-in" : "New check-in"} style={{ gap: 18, scrollMarginTop: 16 }}>
        {editing && (
          <div className="notice between">
            <span>Editing your {editing.time ? fmtTime(editing.time) : "earlier"} check-in</span>
            <button type="button" className="btn sm" onClick={reset}>Cancel</button>
          </div>
        )}
        <div className="card" style={{ flexDirection: "row", gap: 2, padding: 8 }} role="group" aria-label="Mood">
          {[1, 2, 3, 4, 5].map((l) => (
            <button key={l} type="button" className="choice center" aria-pressed={level === l} onClick={() => setLevel(l)} style={{ flex: 1, border: level === l ? undefined : "1.5px solid transparent", background: level === l ? undefined : "transparent" }}>
              <Face level={l} size={44} />
              {MOOD_NAMES[l - 1]}
            </button>
          ))}
        </div>

        <div className="field">
          <span className="flabel">Which emotions fit?</span>
          <div className="hstack">
            {EMOTIONS.map((e) => <button key={e} type="button" className="pill" aria-pressed={emotions.includes(e)} onClick={() => flip(emotions, e, setEmotions)}>{e}</button>)}
          </div>
        </div>

        <div className="field">
          <span className="flabel">What’s shaping your mood?</span>
          <div className="grid4">
            {TRIGGERS.map((t) => (
              <button key={t.key} type="button" className="choice center" aria-pressed={triggers.includes(t.key)} onClick={() => flip(triggers, t.key, setTriggers)}>
                <Icon name={t.icon} size={22} />{t.key}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="note">Note</label>
          <textarea id="note" className="input" placeholder="Anything you want to remember about right now?" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
        </div>
        {error && <div className="error" role="alert">{error}</div>}
        <button type="button" className="btn primary block" onClick={save} disabled={busy}>
          {busy ? "Saving…" : editing ? "Update check-in" : today.length ? "Add another check-in" : "Save check-in"}
        </button>
      </section>

      {today.length > 0 && (
        <section className="stack" style={{ gap: 6 }} aria-label="Today's check-ins">
          <span style={{ fontWeight: 600 }}>Today’s check-ins</span>
          <div className="card list">
            {today.map((m) => (
              <div key={m._id} className="row">
                <Face level={m.level} size={34} />
                <div className="grow">
                  <div className="row-title">{MOOD_NAMES[m.level - 1]}{m.time ? <span className="muted" style={{ fontWeight: 500 }}> · {fmtTime(m.time)}</span> : null}</div>
                  {(m.emotions.length > 0 || m.note) && <div className="row-meta">{[m.emotions.join(", "), m.note].filter(Boolean).join(" — ")}</div>}
                </div>
                <button type="button" className="icon-btn sm" aria-label={`Edit ${fmtTime(m.time) || ""} check-in`} onClick={() => edit(m)}><Icon name="pen" size={16} /></button>
                <button type="button" className="icon-btn sm" aria-label={`Delete ${fmtTime(m.time) || ""} check-in`} onClick={() => remove(m)}><Icon name="trash" size={16} /></button>
              </div>
            ))}
          </div>
        </section>
      )}
      <Toast msg={toast.msg} />
    </main>
  );
}
