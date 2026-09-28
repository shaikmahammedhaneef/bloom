"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "./Icon";
import Reminders from "./Reminders";
import { api } from "@/lib/client";
import type { Me, Settings } from "@/lib/types";

type Ctx = { me: Me | null; refresh: () => Promise<void>; updateSettings: (s: Partial<Settings>) => Promise<void>; setMe: (m: Me) => void };
const MeContext = createContext<Ctx>({ me: null, refresh: async () => {}, updateSettings: async () => {}, setMe: () => {} });
export const useMe = () => useContext(MeContext);

export function applyTheme(s: { accent: string; dark: boolean }) {
  const d = document.documentElement;
  d.dataset.accent = s.accent;
  if (s.dark) d.dataset.theme = "dark";
  else delete d.dataset.theme;
  try {
    localStorage.setItem("bloom-theme", JSON.stringify({ accent: s.accent, dark: s.dark }));
  } catch {}
}

const TABS = [
  { href: "/today", label: "Today", icon: "home", match: ["/today", "/schedule", "/week", "/templates"] },
  { href: "/habits", label: "Habits", icon: "check", match: ["/habits"] },
  { href: "/mood", label: "Mood", icon: "smile", match: ["/mood"] },
  { href: "/health", label: "Health", icon: "heart", match: ["/health"] },
  { href: "/progress", label: "Progress", icon: "chart", match: ["/progress", "/achievements", "/challenges"] },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const m = await api<Me>("/api/me");
      setMe(m);
      setError(null);
      applyTheme(m.settings);
      if (!m.onboarded) router.replace("/onboarding");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateSettings = useCallback(async (s: Partial<Settings>) => {
    const m = await api<Me>("/api/me", { method: "PATCH", body: { settings: s } });
    setMe(m);
    applyTheme(m.settings);
  }, []);

  return (
    <MeContext.Provider value={{ me, refresh, updateSettings, setMe }}>
      {error && !me ? (
        <div className="shell">
          <div className="card" role="alert">
            <div className="error">{error}</div>
            <button type="button" className="btn sm" onClick={refresh}>Try again</button>
          </div>
        </div>
      ) : (
        children
      )}
      <nav className="tabbar" aria-label="Main">
        <div className="tabbar-inner">
          {TABS.map((t) => {
            const active = t.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
            return (
              <Link key={t.href} href={t.href} className="tab" aria-current={active ? "page" : undefined}>
                <span className="ico"><Icon name={t.icon} size={22} /></span>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
      {me && <Reminders me={me} />}
    </MeContext.Provider>
  );
}
