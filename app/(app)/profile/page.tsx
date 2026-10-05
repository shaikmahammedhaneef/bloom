"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useMe } from "@/components/AppShell";
import ChangePassword from "@/components/ChangePassword";
import { Header, Loading, Stepper, TimeInput, Toast, Toggle } from "@/components/ui";
import { api, useToast } from "@/lib/client";
import { ACCENTS } from "@/lib/catalog";
import { notifyPermission, requestNotifyPermission, showNotification, type NotifyPermission } from "@/lib/notify";
import { promptInstall, useInstallState } from "@/lib/pwa";
import { stopPush, syncPush, type PushState } from "@/lib/push";
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
  const [perm, setPerm] = useState<NotifyPermission>("default");
  const install = useInstallState();
  const [push, setPush] = useState<PushState | "checking">("checking");
  const toast = useToast();

  useEffect(() => {
    if (me) {
      setName(me.name);
      setRoleModel(me.roleModel);
    }
  }, [me?._id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPerm(notifyPermission());
    syncPush().then(setPush, () => setPush("off"));
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
    const p = await requestNotifyPermission();
    setPerm(p);
    if (p === "granted") {
      showNotification("Notifications are on", "Bloom will remind you about your routines here.", "/profile");
      syncPush().then(setPush, () => setPush("off"));
    }
    else toast.show("Notifications are blocked. You can allow them in your browser's site settings.");
  }
  async function testNotification() {
    if (!(await showNotification("Test from Bloom", "Notifications are working.", "/profile"))) toast.show("Couldn't show a notification. Check your browser's site settings.");
  }
  async function installApp() {
    if (await promptInstall()) toast.show("Bloom is installed");
  }
  async function logout() {
    await stopPush().catch(() => {});
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
            <div className="grow">
              <div className="row-title">Mood check-in</div>
              <div className="row-meta">Once a day, if you haven’t checked in</div>
              <div style={{ maxWidth: 220, marginTop: 8 }}>
                <TimeInput label="Mood reminder time" optional={false} value={s.reminders.moodTime}
                  onChange={(v) => v && set({ reminders: { ...s.reminders, moodTime: v } })} />
              </div>
            </div>
            <Toggle on={s.reminders.mood} onChange={(v) => set({ reminders: { ...s.reminders, mood: v } })} label="Mood check-in reminder" />
          </div>
          <div className="row">
            <div className="grow"><div className="row-title">Streak alerts</div><div className="row-meta">At 8:00 PM if a streak is at risk</div></div>
            <Toggle on={s.reminders.streak} onChange={(v) => set({ reminders: { ...s.reminders, streak: v } })} label="Streak alerts" />
          </div>
        </div>
        {perm === "default" && (
          <div className="notice stack" style={{ gap: 8 }}>
            <span>Reminders show inside Bloom. Allow notifications to get them as pop-ups, even when Bloom is in the background.</span>
            <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }} onClick={askPermission}><Icon name="bell" size={16} />Allow notifications</button>
          </div>
        )}
        {perm === "denied" && (
          <div className="notice">
            Notifications are blocked for Bloom. In Chrome, click the icon to the left of the address bar, open Site settings, and set Notifications to Allow. Then reload Bloom.
          </div>
        )}
        {perm === "granted" && (
          <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }} onClick={testNotification}><Icon name="bell" size={16} />Send a test notification</button>
        )}
        <span className="muted small">
          {push === "on"
            ? "Reminders reach this device even when Bloom is closed."
            : push === "not-configured"
              ? "Reminders work while Bloom is open. Reminders while it's closed need push set up on the server (see the README)."
              : "Reminders work while Bloom is open, in a browser tab or as an installed app."}
        </span>
      </section>

      <section className="stack" aria-label="Install app">
        <span className="section-title">App</span>
        <div className="card">
          {install === "installed" ? (
            <div className="hstack" style={{ gap: 10 }}><Icon name="check" /><span>Bloom is installed on this device.</span></div>
          ) : install === "available" ? (
            <>
              <span>Install Bloom to open it from your home screen or taskbar, in its own window.</span>
              <button type="button" className="btn sm primary" style={{ alignSelf: "flex-start" }} onClick={installApp}><Icon name="download" size={16} />Install app</button>
            </>
          ) : install === "ios" ? (
            <span>To install Bloom, tap the Share button in Safari, then choose Add to Home Screen.</span>
          ) : (
            <span className="muted">To install Bloom, open it in Chrome or Edge and choose Install from the browser menu (or the install icon in the address bar).</span>
          )}
        </div>
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

      <section className="stack" aria-label="Password">
        <span className="section-title">Password</span>
        <div className="card">
          <span className="muted small">Signed in as {me.email}</span>
          <ChangePassword toast={toast.show} />
        </div>
      </section>

      <button type="button" className="btn block danger" onClick={logout}><Icon name="logout" size={18} />Sign out</button>
      <Toast msg={toast.msg} />
    </main>
  );
}
