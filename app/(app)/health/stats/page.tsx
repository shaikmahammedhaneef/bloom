"use client";
import { useMemo, useState } from "react";
import { ColumnChart, LineChart, type Point } from "@/components/Charts";
import { ErrorBox, Header, Loading, Seg } from "@/components/ui";
import { useApi } from "@/lib/client";
import { addDays, fmtDay, fmtDur, fmtShort, fmtTime, parseKey, toKey } from "@/lib/dates";

type Row = { date: string; sleepMin: number | null; sleepStart: string; sleepEnd: string; water: number; steps: number; weight: number | null };
type Stats = { from: string; to: string; rows: Row[]; weightBefore: number | null; goals: { water: number; steps: number; sleepMin: number } };
type Range = "7" | "30" | "90" | "365";

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const int = (n: number) => Math.round(n).toLocaleString();
const kg = (n: number) => `${Math.round(n * 10) / 10} kg`;
const hours = (min: number) => fmtDur(min);

/** Average clock time for times around midnight (23:30 and 00:30 average to 00:00). */
function avgClock(times: string[]): string | null {
  if (!times.length) return null;
  const mins = times.map((t) => {
    const [h, m] = t.split(":").map(Number);
    const v = h * 60 + m;
    return v < 12 * 60 ? v + 1440 : v; // count from noon so the night doesn't wrap
  });
  const a = Math.round(avg(mins)!) % 1440;
  return `${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

type Bucket = { key: string; label: string; tip: string; rows: Row[] };

/** Days for 7 and 30 days, weeks for 90 days, months for a year. */
function buckets(rows: Row[], range: Range, night = false): Bucket[] {
  if (range === "7" || range === "30") {
    return rows.map((r) => {
      const d = night ? addDays(r.date, -1) : r.date;
      return {
        key: r.date,
        label: range === "7" ? parseKey(d).toLocaleDateString("en-GB", { weekday: "short" }) : String(parseKey(d).getDate()),
        tip: night ? `Night of ${fmtDay(d)}` : fmtDay(d),
        rows: [r],
      };
    });
  }
  const out: Bucket[] = [];
  if (range === "90") {
    for (let i = 0; i < rows.length; i += 7) {
      const chunk = rows.slice(i, i + 7);
      out.push({ key: chunk[0].date, label: fmtShort(chunk[0].date), tip: `${fmtShort(chunk[0].date)} – ${fmtShort(chunk[chunk.length - 1].date)} (average)`, rows: chunk });
    }
    return out;
  }
  for (const r of rows) {
    const m = r.date.slice(0, 7);
    let b = out[out.length - 1];
    if (!b || b.key !== m) {
      const d = parseKey(`${m}-01`);
      b = { key: m, label: d.toLocaleDateString("en-GB", { month: "narrow" }), tip: `${d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })} (average)`, rows: [] };
      out.push(b);
    }
    b.rows.push(r);
  }
  return out;
}

const series = (bs: Bucket[], pick: (r: Row) => number | null): Point[] =>
  bs.map((b) => ({ key: b.key, label: b.label, tip: b.tip, value: avg(b.rows.map(pick).filter((v): v is number => v !== null && v > 0)) }));

function Tiles({ items }: { items: [string, string][] }) {
  return (
    <div className="stat-tiles">
      {items.map(([label, value]) => (
        <div key={label} className="stat-tile"><span>{label}</span><b>{value}</b></div>
      ))}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  if (!rows.length) return null;
  return (
    <details>
      <summary className="small" style={{ cursor: "pointer", fontWeight: 600 }}>Show as table</summary>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section className="card" aria-label={title}>
      <div className="hstack" style={{ gap: 8, fontWeight: 600 }}><span className="series-key" style={{ background: color }} aria-hidden="true" />{title}</div>
      {children}
    </section>
  );
}

export default function HealthStatsPage() {
  const today = toKey();
  const [range, setRange] = useState<Range>("30");
  const { data, error, loading, reload } = useApi<Stats>(`/api/health/stats?to=${today}&days=${range}`);

  const s = useMemo(() => {
    if (!data) return null;
    const { rows, goals } = data;
    const nights = rows.filter((r) => r.sleepMin);
    const stepDays = rows.filter((r) => r.steps > 0);
    const waterDays = rows.filter((r) => r.water > 0);
    const weights = rows.filter((r) => r.weight !== null) as (Row & { weight: number })[];
    let waterStreak = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].water >= goals.water) waterStreak++;
      else if (i === rows.length - 1) continue; // today isn't over yet
      else break;
    }
    const bestSteps = stepDays.reduce<Row | null>((b, r) => (!b || r.steps > b.steps ? r : b), null);
    const longest = nights.reduce<Row | null>((b, r) => (!b || r.sleepMin! > b.sleepMin! ? r : b), null);
    const first = data.weightBefore ?? weights[0]?.weight ?? null;
    const last = weights[weights.length - 1]?.weight ?? null;
    return { rows, goals, nights, stepDays, waterDays, weights, waterStreak, bestSteps, longest, first, last };
  }, [data]);

  const nightB = useMemo(() => (data ? buckets(data.rows, range, true) : []), [data, range]);
  const dayB = useMemo(() => (data ? buckets(data.rows, range) : []), [data, range]);
  const avgNote = range === "90" ? "Weekly averages" : range === "365" ? "Monthly averages" : null;
  const periodDays = data?.rows.length ?? 0;
  const newest = <T,>(xs: T[]) => [...xs].reverse();

  return (
    <main className="shell">
      <Header title="Health stats" sub={data ? `${fmtDay(data.from)} – ${fmtDay(data.to)}` : undefined} back="/health" small />
      <Seg label="Period" value={range} onChange={setRange} options={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }, { value: "365", label: "1 year" }]} />
      {avgNote && <span className="muted small">{avgNote}. Days with nothing logged are left out.</span>}

      {loading && !data ? <Loading /> : error && !data ? <ErrorBox msg={error} retry={reload} /> : s && (
        <>
          <Section title="Sleep" color="var(--c-sleep)">
            {s.nights.length ? (
              <>
                <Tiles items={[
                  ["Average a night", hours(avg(s.nights.map((r) => r.sleepMin!))!)],
                  ["Usual bedtime", fmtTime(avgClock(s.nights.map((r) => r.sleepStart)))],
                  ["Usual wake-up", fmtTime(avgClock(s.nights.map((r) => r.sleepEnd)))],
                  ["Nights of 7h or more", `${s.nights.filter((r) => r.sleepMin! >= s.goals.sleepMin).length} of ${s.nights.length}`],
                  [`Longest (${fmtShort(addDays(s.longest!.date, -1))})`, hours(s.longest!.sleepMin!)],
                  ["Nights logged", `${s.nights.length} of ${periodDays}`],
                ]} />
                <ColumnChart data={series(nightB, (r) => r.sleepMin)} color="var(--c-sleep)" fmt={(v) => `${Math.round(v / 60)}h`} tipFmt={hours} step={180}
                  goal={s.goals.sleepMin} goalLabel="7 hours" label={`Sleep per night, ${fmtDay(s.rows[0].date)} to ${fmtDay(today)}`} />
                <Table head={["Night of", "Bed", "Woke", "Slept"]} rows={newest(s.nights).map((r) => [fmtDay(addDays(r.date, -1)), fmtTime(r.sleepStart), fmtTime(r.sleepEnd), hours(r.sleepMin!)])} />
              </>
            ) : <div className="muted small">No sleep logged in this period.</div>}
          </Section>

          <Section title="Steps" color="var(--c-steps)">
            {s.stepDays.length ? (
              <>
                <Tiles items={[
                  ["Average a day", int(avg(s.stepDays.map((r) => r.steps))!)],
                  ["Total", int(s.stepDays.reduce((a, r) => a + r.steps, 0))],
                  [`Best day (${fmtShort(s.bestSteps!.date)})`, int(s.bestSteps!.steps)],
                  ["Days at goal", `${s.stepDays.filter((r) => r.steps >= s.goals.steps).length} of ${s.stepDays.length}`],
                ]} />
                <ColumnChart data={series(dayB, (r) => r.steps)} color="var(--c-steps)" fmt={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : int(v))} tipFmt={(v) => `${int(v)} steps`}
                  goal={s.goals.steps} goalLabel={`Goal: ${int(s.goals.steps)} steps`} label="Steps per day" />
                <Table head={["Day", "Steps"]} rows={newest(s.stepDays).map((r) => [fmtDay(r.date), int(r.steps)])} />
              </>
            ) : <div className="muted small">No steps logged in this period.</div>}
          </Section>

          <Section title="Water" color="var(--c-water)">
            {s.waterDays.length ? (
              <>
                <Tiles items={[
                  ["Average a day", `${Math.round(avg(s.waterDays.map((r) => r.water))! * 10) / 10} glasses`],
                  ["Days at goal", `${s.waterDays.filter((r) => r.water >= s.goals.water).length} of ${s.waterDays.length}`],
                  ["Goal streak", `${s.waterStreak} day${s.waterStreak === 1 ? "" : "s"}`],
                  ["Total", `${int(s.waterDays.reduce((a, r) => a + r.water, 0))} glasses`],
                ]} />
                <ColumnChart data={series(dayB, (r) => r.water)} color="var(--c-water)" fmt={(v) => `${Math.round(v * 10) / 10}`} tipFmt={(v) => `${Math.round(v * 10) / 10} glasses`}
                  goal={s.goals.water} goalLabel={`Goal: ${s.goals.water} glasses`} label="Glasses of water per day" />
                <Table head={["Day", "Glasses"]} rows={newest(s.waterDays).map((r) => [fmtDay(r.date), String(r.water)])} />
              </>
            ) : <div className="muted small">No water logged in this period.</div>}
          </Section>

          <Section title="Weight" color="var(--c-weight)">
            {s.weights.length ? (
              <>
                <Tiles items={[
                  ["Latest", kg(s.last!)],
                  ["Change this period", s.first !== null && s.last !== null ? `${s.last - s.first > 0 ? "+" : ""}${kg(s.last - s.first)}` : "–"],
                  ["Lowest", kg(Math.min(...s.weights.map((r) => r.weight)))],
                  ["Highest", kg(Math.max(...s.weights.map((r) => r.weight)))],
                ]} />
                <LineChart data={range === "7" || range === "30"
                  ? s.rows.map((r) => ({ key: r.date, label: range === "7" ? parseKey(r.date).toLocaleDateString("en-GB", { weekday: "short" }) : String(parseKey(r.date).getDate()), tip: fmtDay(r.date), value: r.weight }))
                  : series(dayB, (r) => r.weight)}
                  color="var(--c-weight)" fmt={(v) => `${Math.round(v * 10) / 10}`} tipFmt={kg} label="Weight in kg" />
                <Table head={["Day", "Weight"]} rows={newest(s.weights).map((r) => [fmtDay(r.date), kg(r.weight)])} />
              </>
            ) : <div className="muted small">No weight logged in this period.</div>}
          </Section>
        </>
      )}
    </main>
  );
}
