"use client";
import { useState } from "react";
import Icon from "@/components/Icon";
import { Header, Tile, Toast } from "@/components/ui";
import { api, useToast } from "@/lib/client";
import { TEMPLATE_KINDS, TEMPLATES } from "@/lib/catalog";
import { repeatLabel } from "@/lib/habitLogic";
import { timeRange, toKey } from "@/lib/dates";

export default function TemplatesPage() {
  const [kind, setKind] = useState("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const list = TEMPLATES.filter((t) => (kind === "All" || t.kind === kind) && t.name.toLowerCase().includes(q.toLowerCase()));

  async function use(key: string) {
    setBusy(key);
    try {
      const r = await api<{ added: number }>("/api/templates/apply", { body: { key, today: toKey() } });
      toast.show(r.added ? `Added ${r.added} habit${r.added > 1 ? "s" : ""} to your plan` : "You already have all of these habits");
    } catch (e) {
      toast.show((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="shell">
      <Header title="Templates" sub="Ready-made routines. Change any time afterwards." back="/today" small />
      <div className="field">
        <label htmlFor="tq" className="sr">Search templates</label>
        <input id="tq" className="input" placeholder="Search templates" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="hstack">
        {TEMPLATE_KINDS.map((k) => <button key={k} type="button" className="pill" aria-pressed={kind === k} onClick={() => setKind(k)}>{k}</button>)}
      </div>
      <div className="stack">
        {list.map((t) => (
          <div key={t.key} className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Tile icon={t.icon} tone={t.tone} size={48} radius={14} iconSize={22} />
              <div className="grow">
                <div className="row-title">{t.name}</div>
                <div className="row-meta">{t.desc}</div>
              </div>
            </div>
            <div className="hstack">
              <button type="button" className="btn sm" aria-expanded={open === t.key} onClick={() => setOpen(open === t.key ? null : t.key)}>
                {open === t.key ? "Hide habits" : `See ${t.habits.length} habits`}
              </button>
              <button type="button" className="btn sm primary" onClick={() => use(t.key)} disabled={busy === t.key}>
                <Icon name="plus" size={16} />{busy === t.key ? "Adding…" : "Use template"}
              </button>
            </div>
            {open === t.key && (
              <div className="card list" style={{ background: "var(--bg)" }}>
                {t.habits.map((h) => (
                  <div key={h.name} className="row" style={{ minHeight: 48 }}>
                    <Tile icon={h.icon} tone={h.color} size={34} radius={10} iconSize={17} />
                    <div className="grow">
                      <div className="row-title" style={{ fontSize: 14 }}>{h.name}</div>
                      <div className="row-meta">{timeRange(h.startTime, h.endTime)}  ·  {repeatLabel({ repeat: h.repeat, timesPerWeek: h.timesPerWeek ?? 3, days: h.days ?? [] })}{h.goal ? `  ·  ${h.goal} ${h.unit}` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {!list.length && <div className="card empty">No templates match. Try another search.</div>}
      </div>
      <Toast msg={toast.msg} />
    </main>
  );
}
