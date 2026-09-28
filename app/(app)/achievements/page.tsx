"use client";
import Icon from "@/components/Icon";
import { Bar, ErrorBox, Header, Loading } from "@/components/ui";
import { useApi } from "@/lib/client";
import { toKey } from "@/lib/dates";
import type { StatsData } from "@/lib/types";

export default function AchievementsPage() {
  const { data, error, loading, reload } = useApi<StatsData>(`/api/stats?today=${toKey()}&range=week`);
  return (
    <main className="shell">
      <Header title="Achievements" back="/progress" small />
      {loading && !data ? <Loading /> : error && !data ? <ErrorBox msg={error} retry={reload} /> : data && (
        <>
          <section style={{ borderRadius: 22, background: "var(--acc)", color: "var(--on-acc)", padding: 20, display: "flex", flexDirection: "column", gap: 12 }} aria-label="Your level">
            <div className="between" style={{ alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Level {data.level}</div>
                <div style={{ fontFamily: "var(--fd)", fontSize: 28, fontWeight: 600 }}>{data.levelName}</div>
              </div>
              <span style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="leaf" size={24} /></span>
            </div>
            <div className="between" style={{ fontSize: 14 }}><b>{data.points.toLocaleString()} pts</b><span>{data.levelNext.toLocaleString()}</span></div>
            <Bar pct={((data.points - data.levelStart) / (data.levelNext - data.levelStart)) * 100} color="currentColor" track="rgba(255,255,255,.28)" />
            <div style={{ fontSize: 13.5 }}>{(data.levelNext - data.points).toLocaleString()} points to level {data.level + 1}, {data.nextName}</div>
          </section>

          <section className="card" aria-label="Badges">
            <div className="between"><span style={{ fontWeight: 600 }}>Badges</span><span className="muted small">{data.badges.filter((b) => b.earned).length} of {data.badges.length}</span></div>
            <div className="grid3" style={{ gap: "18px 8px" }}>
              {data.badges.map((b) => (
                <div key={b.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }} title={b.desc}>
                  <span className={b.earned ? "tone-honey" : ""} style={{ width: 62, height: 62, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: b.earned ? "2px solid var(--t-honey-fg)" : "2px dashed var(--line)", color: b.earned ? undefined : "var(--muted)" }}>
                    <Icon name={b.earned ? b.icon : "lock"} size={24} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: b.earned ? "var(--ink)" : "var(--muted)" }}>{b.name}</span>
                  <span className="muted" style={{ fontSize: 11.5, lineHeight: 1.3 }}>{b.desc}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card list" aria-label="How you earn points">
            <div className="row" style={{ minHeight: 44, fontWeight: 600 }}>How you earn points</div>
            {data.breakdown.map((r) => (
              <div key={r.label} className="row" style={{ minHeight: 48 }}>
                <div className="grow"><div className="row-title" style={{ fontWeight: 500 }}>{r.label}</div><div className="row-meta">{r.count} so far</div></div>
                <b style={{ color: "var(--acc)" }}>+{r.each} each</b>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
