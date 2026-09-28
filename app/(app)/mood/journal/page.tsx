"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import MoodTabs from "@/components/MoodTabs";
import { Face, Header, Toast } from "@/components/ui";
import { api, useApi, useToast } from "@/lib/client";
import { promptFor } from "@/lib/catalog";
import { fmtDay, toKey } from "@/lib/dates";
import type { JournalEntry } from "@/lib/types";

type Past = JournalEntry & { mood: number | null };

export default function JournalPage() {
  const date = toKey();
  const [offset, setOffset] = useState(0);
  const [prompt, setPrompt] = useState(promptFor(date));
  const [text, setText] = useState("");
  const [grat, setGrat] = useState(["", "", ""]);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const past = useApi<Past[]>("/api/journal");

  useEffect(() => {
    api<JournalEntry | null>(`/api/journal?date=${date}`).then((j) => {
      if (!j) return;
      if (j.prompt) setPrompt(j.prompt);
      setText(j.text);
      setGrat([0, 1, 2].map((i) => j.gratitude[i] ?? ""));
    }).catch(() => {});
  }, [date]);

  function shuffle() {
    const o = offset + 1;
    setOffset(o);
    setPrompt(promptFor(date, o));
  }

  async function save() {
    setError(null);
    if (!text.trim() && !grat.some((g) => g.trim())) return setError("Write something before saving.");
    setBusy(true);
    try {
      await api("/api/journal", { body: { date, prompt, text, gratitude: grat } });
      toast.show("Entry saved");
      past.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <Header title="Journal" sub="Reflect for a few minutes" small />
      <MoodTabs current="/mood/journal" />
      <section className="soft" style={{ background: "var(--t-lilac-bg)", color: "var(--t-lilac-fg)", gap: 12 }} aria-label="Today's prompt">
        <div className="hstack" style={{ fontSize: 13, fontWeight: 600, gap: 6 }}><Icon name="sparkle" size={16} />Today’s prompt</div>
        <p style={{ fontFamily: "var(--fd)", fontSize: 21, lineHeight: 1.35, color: "var(--ink)" }}>{prompt}</p>
        <button type="button" className="btn sm" style={{ alignSelf: "flex-start", border: "none", color: "var(--t-lilac-fg)" }} onClick={shuffle}><Icon name="shuffle" size={16} />Another prompt</button>
      </section>
      <div className="field">
        <label htmlFor="jtext" className="sr">Your reflection</label>
        <textarea id="jtext" className="input" style={{ minHeight: 140 }} placeholder="Start writing…" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <section className="card" aria-label="Three good things">
        <div className="hstack" style={{ fontWeight: 600, gap: 8 }}><span style={{ color: "var(--t-rose-fg)", display: "flex" }}><Icon name="heart" size={18} /></span>Three good things</div>
        {grat.map((g, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="tone-honey" style={{ width: 28, height: 28, flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>{i + 1}</span>
            <label htmlFor={`g${i}`} className="sr">Good thing {i + 1}</label>
            <input id={`g${i}`} className="input" style={{ minHeight: 44 }} placeholder="Something that went well" value={g} onChange={(e) => setGrat(grat.map((x, j) => (j === i ? e.target.value : x)))} maxLength={200} />
          </div>
        ))}
      </section>
      {error && <div className="error" role="alert">{error}</div>}
      <button type="button" className="btn primary block" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save entry"}</button>

      <section className="stack" aria-label="Earlier entries">
        <span className="section-title">Earlier entries</span>
        {past.data && past.data.filter((p) => p.date !== date).length ? (
          <div className="card list">
            {past.data.filter((p) => p.date !== date).map((p) => (
              <div key={p.date}>
                <button type="button" className="row" style={{ width: "100%", border: "none", background: "transparent", textAlign: "left", padding: "6px 0" }} aria-expanded={open === p.date} onClick={() => setOpen(open === p.date ? null : p.date)}>
                  {p.mood ? <Face level={p.mood} size={34} /> : <span className="tile tone-lilac" style={{ width: 34, height: 34, borderRadius: "50%" }}><Icon name="pen" size={16} /></span>}
                  <div className="grow">
                    <div className="row-title">{fmtDay(p.date)}</div>
                    <div className="row-meta" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.text || p.gratitude.filter(Boolean).join(", ")}</div>
                  </div>
                  <Icon name="chevR" size={18} />
                </button>
                {open === p.date && (
                  <div className="stack" style={{ padding: "0 0 14px 46px", gap: 8 }}>
                    {p.prompt && <div className="muted small">{p.prompt}</div>}
                    {p.text && <p style={{ whiteSpace: "pre-wrap" }}>{p.text}</p>}
                    {p.gratitude.some(Boolean) && <div className="small"><b>Good things:</b> {p.gratitude.filter(Boolean).join(" · ")}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card empty small">Your past entries will show up here.</div>
        )}
      </section>
      <Toast msg={toast.msg} />
    </main>
  );
}
