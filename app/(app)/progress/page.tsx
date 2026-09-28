"use client";
import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/Icon";
import { ErrorBox, Face, Header, Loading, Seg, Tile } from "@/components/ui";
import { useApi } from "@/lib/client";
import { MOOD_NAMES } from "@/lib/catalog";
import { fmtShort, parseKey, toKey } from "@/lib/dates";
import type { StatsData } from "@/lib/types";

export default function ProgressPage() {
  const today = toKey();
  const [range, setRange] = useState<"week" | "month">("week");
  const { data, error, loading, reload } = useApi<StatsData>(`/api/stats?today=${today}&range=${range}`);

  return (
    <main className="shell">
      <Header title="Progress" sub={data ? `${fmtShort(data.from)} – ${fmtShort(data.to)}` : undefined}
        right={<Link href="/profile#export" className="icon-btn" aria-label="Export your data"><Icon name="download" /></Link>} />
      <Seg label="Range" value={range} onChange={setRange} options={[{ value: "week", label: "Last 7 days" }, { value: "month", label: "This month" }]} />
      {loading && !data ? <Loading /> : error && !data ? <ErrorBox msg={error} retry={reload} /> : data && (
        <>
          <div className="grid3">
            <div className="stat"><b>{data.avgCompletion === null ? "–" : `${data.avgCompletion}%`}</b><span>Avg. completion</span></div>
            <div className="stat"><b>{data.habitsDone}</b><span>Habits done</span></div>
            <div className="stat"><b>{data.avgMood === null ? "–" : MOOD_NAMES[Math.round(data.avgMood) - 1]}</b><span>Avg. mood</span></div>
          </div>
          <CompletionChart days={data.days} range={range} today={today} />
          <MoodChart series={data.moodSeries} from={data.from} to={data.to} />
          <section className="soft" style={{ background: "var(--t-lilac-bg)", color: "var(--t-lilac-fg)" }} aria-label="Insights">
            <span style={{ fontWeight: 600 }}>Mood and habits</span>
            {data.insights.length ? data.insights.map((t) => (
              <div key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ marginTop: 2, display: "flex" }}><Icon name="sparkle" size={18} /></span>
                <span style={{ color: "var(--ink)", fontSize: 14.5 }}>{t}</span>
              </div>
            )) : <span style={{ color: "var(--ink)", fontSize: 14.5 }}>Keep logging habits and checking in your mood. After a week or two, patterns will show up here.</span>}
          </section>
          <Link href="/achievements" className="card" style={{ flexDirection: "row", alignItems: "center", gap: 12, color: "var(--ink)" }}>
            <Tile icon="trophy" tone="honey" />
            <div className="grow"><div className="row-title">Achievements</div><div className="row-meta">Level {data.level}, {data.levelName}  ·  {data.badges.filter((b) => b.earned).length} of {data.badges.length} badges</div></div>
            <Icon name="chevR" />
          </Link>
          <Link href="/challenges" className="card" style={{ flexDirection: "row", alignItems: "center", gap: 12, color: "var(--ink)" }}>
            <Tile icon="flag" tone="peach" />
            <div className="grow"><div className="row-title">Challenges</div><div className="row-meta">7 and 21-day challenges</div></div>
            <Icon name="chevR" />
          </Link>
        </>
      )}
    </main>
  );
}

function CompletionChart({ days, range, today }: { days: StatsData["days"]; range: string; today: string }) {
  const W = 320;
  const H = 150;
  const n = days.length;
  const gap = range === "week" ? 14 : 3;
  const bw = (W - gap * (n - 1)) / n;
  const max = Math.max(0, ...days.map((d) => d.pct ?? 0));
  return (
    <section className="card" aria-label="Daily completion">
      <span style={{ fontWeight: 600 }}>Daily completion</span>
      <svg viewBox={`0 0 ${W} ${H + 22}`} width="100%" role="img" aria-label={`Daily completion: ${days.filter((d) => d.pct !== null).map((d) => `${fmtShort(d.date)} ${d.pct}%`).join(", ")}`}>
        {[0, 50, 100].map((v) => <line key={v} x1="0" x2={W} y1={H - (v / 100) * H} y2={H - (v / 100) * H} stroke="var(--line)" />)}
        {days.map((d, i) => {
          const x = i * (bw + gap);
          const h = d.pct === null ? 0 : Math.max(3, (d.pct / 100) * H);
          const label = range === "week" ? parseKey(d.date).toLocaleDateString("en-GB", { weekday: "narrow" }) : (i % 5 === 0 ? String(parseKey(d.date).getDate()) : "");
          return (
            <g key={d.date}>
              {d.pct === null && d.date <= today ? null : <rect x={x} y={H - h} width={bw} height={h} rx={Math.min(8, bw / 2)} fill={d.pct === max && max > 0 ? "var(--acc)" : "var(--heat-2)"} />}
              {range === "week" && d.pct !== null && <text x={x + bw / 2} y={H - h - 5} textAnchor="middle" fontSize="11" fill="var(--muted)">{d.pct}</text>}
              <text x={x + bw / 2} y={H + 16} textAnchor="middle" fontSize="11" fill="var(--muted)" fontWeight={d.date === today ? 700 : 400}>{label}</text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

function MoodChart({ series, from, to }: { series: { date: string; level: number }[]; from: string; to: string }) {
  if (series.length < 2) {
    return <section className="card"><span style={{ fontWeight: 600 }}>Mood</span><span className="muted small">Check in on at least two days to see your mood trend.</span></section>;
  }
  const W = 280;
  const H = 110;
  const span = Math.max(1, (parseKey(to).getTime() - parseKey(from).getTime()) / 86400000);
  const pts = series.map((s) => {
    const x = ((parseKey(s.date).getTime() - parseKey(from).getTime()) / 86400000 / span) * W;
    const y = H - ((s.level - 1) / 4) * (H - 10) - 5;
    return { x, y, s };
  });
  return (
    <section className="card" aria-label="Mood trend">
      <span style={{ fontWeight: 600 }}>Mood</span>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: 110 }}>
          <Face level={5} size={20} /><Face level={3} size={20} /><Face level={1} size={20} />
        </div>
        <svg viewBox={`-6 0 ${W + 12} ${H}`} width="100%" height={H} role="img" aria-label={`Mood trend: ${series.map((s) => `${fmtShort(s.date)} ${MOOD_NAMES[s.level - 1]}`).join(", ")}`} preserveAspectRatio="none">
          {[0, 1, 2, 3, 4].map((k) => <line key={k} x1="0" x2={W} y1={H - (k / 4) * (H - 10) - 5} y2={H - (k / 4) * (H - 10) - 5} stroke="var(--line)" />)}
          <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="var(--t-lilac-fg)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {pts.map((p) => <circle key={p.s.date} cx={p.x} cy={p.y} r="3.5" fill="var(--t-lilac-fg)" />)}
        </svg>
      </div>
    </section>
  );
}
