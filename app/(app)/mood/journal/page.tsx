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

      <section className="stack" aria-label="Your entries">
        <span className="section-title">Your entries</span>
        {past.loading && !past.data ? (
          <div className="card empty small">Loading…</div>
        ) : past.error && !past.data ? (
          <div className="card small" role="alert"><span className="error">{past.error}</span><button type="button" className="btn sm" onClick={past.reload}>Try again</button></div>
        ) : past.data && past.data.length ? (
          <div className="card list">
            {past.data.map((p) => {
              const good = p.gratitude.filter((g) => g && g.trim());
              const isOpen = open === p.date;
              return (
                <div key={p.date} className="stack" style={{ gap: 8, padding: "10px 0" }}>
                  <div className="row" style={{ minHeight: 0, padding: 0 }}>
                    {p.mood ? <Face level={p.mood} size={34} /> : <span className="tile tone-lilac" style={{ width: 34, height: 34, borderRadius: "50%" }}><Icon name="pen" size={16} /></span>}
                    <div className="grow">
                      <div className="row-title">{p.date === date ? "Today" : fmtDay(p.date)}</div>
                      {p.prompt && <div className="row-meta">{p.prompt}</div>}
                    </div>
                  </div>
                  {good.length > 0 && (
                    <div style={{ paddingLeft: 46 }}>
                      <div className="small muted" style={{ fontWeight: 600, marginBottom: 4 }}>Three good things</div>
                      <ol className="good-list">{good.map((g, i) => <li key={i}>{g}</li>)}</ol>
                    </div>
                  )}
                  {p.text && (
                    <div style={{ paddingLeft: 46 }}>
                      <p className="small" style={{ whiteSpace: "pre-wrap", margin: 0, ...(isOpen ? {} : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }) }}>{p.text}</p>
                      {p.text.length > 120 && (
                        <button type="button" className="btn ghost sm" style={{ padding: 0, minHeight: 30 }} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.date)}>
                          {isOpen ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card empty small">Your entries and good things will show up here after you save.</div>
        )}
      </section>
      <Toast msg={toast.msg} />
    </main>
  );
}
