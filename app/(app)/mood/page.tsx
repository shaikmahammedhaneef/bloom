"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import MoodTabs from "@/components/MoodTabs";
import { Face, Header, Toast } from "@/components/ui";
import { api, useToast } from "@/lib/client";
import { EMOTIONS, MOOD_NAMES, TRIGGERS } from "@/lib/catalog";
import { fmtLong, toKey } from "@/lib/dates";
import type { Mood } from "@/lib/types";

export default function MoodPage() {
  const date = toKey();
  const [level, setLevel] = useState(0);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [existing, setExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api<Mood | null>(`/api/mood?date=${date}`).then((m) => {
      if (!m) return;
      setExisting(true);
      setLevel(m.level);
      setEmotions(m.emotions);
      setTriggers(m.triggers);
      setNote(m.note);
    }).catch(() => {});
  }, [date]);

  const flip = (list: string[], v: string, set: (x: string[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function save() {
    setError(null);
    if (!level) return setError("Pick how you feel first.");
    setBusy(true);
    try {
      await api("/api/mood", { body: { date, level, emotions, triggers, note } });
      setExisting(true);
      toast.show(existing ? "Check-in updated" : "Check-in saved. +5 points");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <Header title="How are you feeling?" sub={fmtLong(date)} small />
      <MoodTabs current="/mood" />
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
        <textarea id="note" className="input" placeholder="Anything you want to remember about today?" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      <button type="button" className="btn primary block" onClick={save} disabled={busy}>{busy ? "Saving…" : existing ? "Update check-in" : "Save check-in"}</button>
      <Toast msg={toast.msg} />
    </main>
  );
}
