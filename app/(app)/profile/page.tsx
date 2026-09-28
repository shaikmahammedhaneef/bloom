"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useMe } from "@/components/AppShell";
import { Header, Loading, Stepper, Toast, Toggle } from "@/components/ui";
import { api, useToast } from "@/lib/client";
import { ACCENTS } from "@/lib/catalog";
import type { Me } from "@/lib/types";

const EXPORTS = [
  { kind: "habits", label: "Habit history" },
  { kind: "todos", label: "To-dos" },
  { kind: "moods", label: "Mood check-ins" },
  { kind: "journal", label: "Journal entries" },
  { kind: "health", label: "Water, sleep, steps and weight" },
  { kind: "sessions", label: "Breathing, focus and workouts" },
];

export default function ProfilePage() {
  const { me, setMe, updateSettings } = useMe();
  const [name, setName] = useState("");
  const [roleModel, setRoleModel] = useState("");
  const [perm, setPerm] = useState<string>("default");
  const toast = useToast();

  useEffect(() => {
    if (me) {
      setName(me.name);
      setRoleModel(me.roleModel);
    }
  }, [me?._id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  if (!me) return <main className="shell"><Loading /></main>;
  const s = me.settings;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      setMe(await api<Me>("/api/me", { method: "PATCH", body: { name, roleModel } }));
      toast.show("Profile saved");
    } catch (err) {
      toast.show((err as Error).message);
    }
  }
  async function set(partial: Parameters<typeof updateSettings>[0]) {
    try {
      await updateSettings(partial);
    } catch (err) {
      toast.show((err as Error).message);
    }
  }
  async function askPermission() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
    toast.show(p === "granted" ? "Notifications are on" : "Notifications are blocked. You can allow them in your browser's site settings.");
  }
  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <main className="shell">
      <Header title="Profile" back="/today" small />

      <form className="card" onSubmit={saveProfile}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="tone-peach" style={{ width: 60, height: 60, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fd)", fontSize: 26, fontWeight: 600 }}>
            {(me.name || "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="grow"><div className="row-title" style={{ fontSize: 17 }}>{me.name}</div><div className="row-meta">{me.email}</div></div>
        </div>
        <div className="field">
          <label htmlFor="pname">Name</label>
          <input id="pname" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </div>
        <div className="field">
          <label htmlFor="prm">Who you want to become</label>
          <input id="prm" className="input" placeholder="A calm, rested person" value={roleModel} onChange={(e) => setRoleModel(e.target.value)} maxLength={200} />
        </div>
        <button className="btn sm primary" style={{ alignSelf: "flex-start" }}>Save profile</button>
      </form>

      <section className="stack" aria-label="Appearance">
        <span className="section-title">Appearance</span>
        <div className="card">
          <span style={{ fontWeight: 600 }}>Theme color</span>
          <div className="hstack" style={{ gap: 14 }}>
            {ACCENTS.map((a) => (
              <button key={a.key} type="button" aria-label={a.name} aria-pressed={s.accent === a.key} onClick={() => set({ accent: a.key })}
                style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: a.hex, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: s.accent === a.key ? "0 0 0 3px var(--surf), 0 0 0 5px var(--ink)" : "none" }}>
                {s.accent === a.key && <Icon name="check" size={18} stroke={2.6} />}
              </button>
            ))}
          </div>
          <div className="between" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <div className="hstack" style={{ gap: 10 }}><Icon name="moon" /><span style={{ fontWeight: 600 }}>Dark mode</span></div>
            <Toggle on={s.dark} onChange={(v) => set({ dark: v })} label="Dark mode" />
          </div>
        </div>
      </section>

      <section className="stack" aria-label="Reminders">
        <span className="section-title">Reminders</span>
        <div className="card list">
          <div className="row">
            <div className="grow"><div className="row-title">Routine reminders</div><div className="row-meta">At each habit’s and to-do’s from time</div></div>
            <Toggle on={s.reminders.routine} onChange={(v) => set({ reminders: { ...s.reminders, routine: v } })} label="Routine reminders" />
          </div>
          <div className="row">
            <div className="grow"><div className="row-title">Mood check-in</div><div className="row-meta">Once a day, if you haven’t checked in</div></div>
            <input type="time" className="input" style={{ width: 120, minHeight: 40 }} aria-label="Mood reminder time" value={s.reminders.moodTime}
              onChange={(e) => e.target.value && set({ reminders: { ...s.reminders, moodTime: e.target.value } })} />
            <Toggle on={s.reminders.mood} onChange={(v) => set({ reminders: { ...s.reminders, mood: v } })} label="Mood check-in reminder" />
          </div>
          <div className="row">
            <div className="grow"><div className="row-title">Streak alerts</div><div className="row-meta">At 20:00 if a streak is at risk</div></div>
            <Toggle on={s.reminders.streak} onChange={(v) => set({ reminders: { ...s.reminders, streak: v } })} label="Streak alerts" />
          </div>
        </div>
        {perm !== "granted" && perm !== "unsupported" && (
          <div className="notice stack" style={{ gap: 8 }}>
            <span>Reminders show inside Bloom. Allow notifications to get them even when Bloom is in a background tab.</span>
            <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }} onClick={askPermission}><Icon name="bell" size={16} />Allow notifications</button>
          </div>
        )}
        <span className="muted small">Reminders work while Bloom is open in a browser tab.</span>
      </section>

      <section className="stack" aria-label="Daily goals">
        <span className="section-title">Daily goals</span>
        <div className="card list">
          <div className="row">
            <div className="grow"><div className="row-title">Water</div><div className="row-meta">Glasses per day</div></div>
            <Stepper value={s.waterGoal} onChange={(v) => set({ waterGoal: v })} min={1} max={30} label="water goal" />
          </div>
          <div className="row">
            <div className="grow"><div className="row-title">Steps</div><div className="row-meta">{s.stepGoal.toLocaleString()} per day</div></div>
            <div className="counter">
              <button type="button" className="icon-btn sm" aria-label="Decrease step goal" onClick={() => set({ stepGoal: Math.max(500, s.stepGoal - 500) })}><Icon name="minus" size={16} /></button>
              <button type="button" className="icon-btn sm" aria-label="Increase step goal" onClick={() => set({ stepGoal: Math.min(100000, s.stepGoal + 500) })}><Icon name="plus" size={16} /></button>
            </div>
          </div>
        </div>
      </section>

      <section id="export" className="stack" aria-label="Your data">
        <span className="section-title">Your data</span>
        <div className="card list">
          <div className="row">
            <Icon name="sync" />
            <div className="grow"><div className="row-title">Synced to your account</div><div className="row-meta">Sign in on any device to pick up where you left off</div></div>
          </div>
          {EXPORTS.map((x) => (
            <a key={x.kind} href={`/api/export?kind=${x.kind}`} className="row" style={{ color: "var(--ink)" }} download>
              <Icon name="download" />
              <div className="grow"><div className="row-title">{x.label}</div><div className="row-meta">Download as CSV</div></div>
            </a>
          ))}
        </div>
      </section>

      <button type="button" className="btn block danger" onClick={logout}><Icon name="logout" size={18} />Sign out</button>
      <Toast msg={toast.msg} />
    </main>
  );
}
