"use client";
// Small single-series SVG charts: columns (with an optional goal line) and a
// line with dots. Hover, tap or use arrow keys to read a value.
import { useEffect, useRef, useState } from "react";

export type Point = { key: string; label: string; tip: string; value: number | null };

const H = 170;
const PAD = { top: 12, right: 8, bottom: 24, left: 40 };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Round numbers for the y-axis: 0 and up to 3 steps. */
function niceTicks(min: number, max: number, fixedStep?: number): number[] {
  const span = Math.max(1e-9, max - min);
  const raw = span / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = fixedStep ?? [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= max + step * 0.999; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

/** Which x labels to print so they never collide. */
function labelEvery(n: number, width: number) {
  return Math.max(1, Math.ceil(n / Math.max(2, Math.floor(width / 46))));
}

function Tooltip({ x, width, title, value }: { x: number; width: number; title: string; value: string }) {
  const left = Math.min(Math.max(x, 70), width - 70);
  return (
    <div className="chart-tip" style={{ left }} role="status">
      <b>{value}</b>
      <span>{title}</span>
    </div>
  );
}

function useHover(n: number) {
  const [i, setI] = useState<number | null>(null);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setI((v) => Math.min(n - 1, (v ?? -1) + 1));
    else if (e.key === "ArrowLeft") setI((v) => Math.max(0, (v ?? n) - 1));
    else if (e.key === "Escape") setI(null);
    else return;
    e.preventDefault();
  };
  return { i, setI, onKey };
}

export function ColumnChart({ data, color, fmt, tipFmt = fmt, goal, goalLabel, label, step }: {
  data: Point[];
  color: string;
  fmt: (v: number) => string; // axis labels
  tipFmt?: (v: number) => string; // exact value in the tooltip
  goal?: number;
  goalLabel?: string;
  label: string;
  step?: number; // y-axis tick step, e.g. 3 hours
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { i, setI, onKey } = useHover(data.length);
  const vals = data.map((d) => d.value ?? 0);
  const ticks = niceTicks(0, Math.max(1, ...vals, goal ?? 0), step);
  const yMax = ticks[ticks.length - 1];
  const iw = width - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const band = iw / data.length;
  const bw = Math.max(1, Math.min(24, band - 2)); // 2px surface gap between neighbours
  const y = (v: number) => PAD.top + ih - (v / yMax) * ih;
  const every = labelEvery(data.length, iw);
  const pick = (clientX: number, el: Element) => {
    const r = el.getBoundingClientRect();
    const idx = Math.floor((clientX - r.left - PAD.left) / band);
    setI(idx >= 0 && idx < data.length ? idx : null);
  };
  const cur = i !== null ? data[i] : null;

  return (
    <div ref={ref} className="chart">
      <svg width={width} height={H} role="img" aria-label={label} tabIndex={0} onKeyDown={onKey}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget)} onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setI(null)} onBlur={() => setI(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={PAD.left - 6} y={y(t)} className="chart-axis" textAnchor="end" dominantBaseline="middle">{fmt(t)}</text>
          </g>
        ))}
        {i !== null && <rect x={PAD.left + i * band} y={PAD.top} width={band} height={ih} className="chart-hover" />}
        {data.map((d, k) => {
          if (!d.value) return null;
          const x = PAD.left + k * band + (band - bw) / 2;
          const top = y(d.value);
          const h = PAD.top + ih - top;
          const r = Math.min(4, bw / 2, h);
          // Rounded data end, square at the baseline.
          const path = `M${x},${PAD.top + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${PAD.top + ih} Z`;
          return <path key={d.key} d={path} fill={color} opacity={i === null || i === k ? 1 : 0.45} />;
        })}
        {goal !== undefined && goal > 0 && <line x1={PAD.left} x2={width - PAD.right} y1={y(goal)} y2={y(goal)} className="chart-goal" />}
        {data.map((d, k) =>
          k % every === 0 ? (
            <text key={d.key} x={PAD.left + k * band + band / 2} y={H - 6} className="chart-axis" textAnchor="middle">{d.label}</text>
          ) : null,
        )}
      </svg>
      {cur && <Tooltip x={PAD.left + (i as number) * band + band / 2} width={width} title={cur.tip} value={cur.value ? tipFmt(cur.value) : "Not logged"} />}
      {goal !== undefined && goal > 0 && (
        <div className="chart-key"><svg width="18" height="6" aria-hidden="true"><line x1="0" x2="18" y1="3" y2="3" className="chart-goal" /></svg>{goalLabel ?? "Goal"}</div>
      )}
    </div>
  );
}

export function LineChart({ data, color, fmt, tipFmt = fmt, label }: { data: Point[]; color: string; fmt: (v: number) => string; tipFmt?: (v: number) => string; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { i, setI, onKey } = useHover(data.length);
  const logged = data.map((d, k) => ({ ...d, k })).filter((d) => d.value !== null) as (Point & { k: number; value: number })[];
  const lo = Math.min(...logged.map((d) => d.value));
  const hi = Math.max(...logged.map((d) => d.value));
  const ticks = niceTicks(lo - Math.max(0.5, (hi - lo) * 0.15), hi + Math.max(0.5, (hi - lo) * 0.15));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const iw = width - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (k: number) => PAD.left + ((k + 0.5) / data.length) * iw; // centred in its slot, so edge labels fit
  const y = (v: number) => PAD.top + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const every = labelEvery(data.length, iw);
  // Snap the hover to the nearest logged point.
  const pick = (clientX: number, el: Element) => {
    const r = el.getBoundingClientRect();
    const px = clientX - r.left;
    let best: number | null = null;
    for (const d of logged) if (best === null || Math.abs(x(d.k) - px) < Math.abs(x(best) - px)) best = d.k;
    setI(best);
  };
  const onKeyLogged = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return onKey(e);
    e.preventDefault();
    const pos = logged.findIndex((d) => d.k === i);
    const next = e.key === "ArrowRight" ? Math.min(logged.length - 1, pos + 1) : Math.max(0, pos === -1 ? logged.length - 1 : pos - 1);
    setI(logged[next]?.k ?? null);
  };
  const cur = i !== null ? data[i] : null;

  return (
    <div ref={ref} className="chart">
      <svg width={width} height={H} role="img" aria-label={label} tabIndex={0} onKeyDown={onKeyLogged}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget)} onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setI(null)} onBlur={() => setI(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={PAD.left - 6} y={y(t)} className="chart-axis" textAnchor="end" dominantBaseline="middle">{fmt(t)}</text>
          </g>
        ))}
        {i !== null && <line x1={x(i)} x2={x(i)} y1={PAD.top} y2={PAD.top + ih} className="chart-crosshair" />}
        {logged.length > 1 && (
          <polyline points={logged.map((d) => `${x(d.k)},${y(d.value)}`).join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {logged.map((d) => (
          <circle key={d.key} cx={x(d.k)} cy={y(d.value)} r={i === d.k ? 6 : 4} fill={color} stroke="var(--surf)" strokeWidth={2} />
        ))}
        {data.map((d, k) =>
          k % every === 0 ? (
            <text key={d.key} x={x(k)} y={H - 6} className="chart-axis" textAnchor="middle">{d.label}</text>
          ) : null,
        )}
      </svg>
      {cur && cur.value !== null && <Tooltip x={x(i as number)} width={width} title={cur.tip} value={tipFmt(cur.value)} />}
    </div>
  );
}
