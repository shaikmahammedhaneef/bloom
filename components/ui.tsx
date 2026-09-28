"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "./Icon";
import { MOOD_NAMES } from "@/lib/catalog";

export function Tile({ icon, tone, size = 40, radius = 12, iconSize = 20 }: { icon: string; tone: string; size?: number; radius?: number; iconSize?: number }) {
  return (
    <div className={`tile tone-${tone}`} style={{ width: size, height: size, borderRadius: radius }}>
      <Icon name={icon} size={iconSize} />
    </div>
  );
}

export function Ring({ pct, size = 96, stroke = 10, children, color = "var(--acc)", track = "var(--acc-soft)" }: {
  pct: number; size?: number; stroke?: number; children?: React.ReactNode; color?: string; track?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset .4s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

const FACE_FILL = ["#B7B2CF", "#B9CBE3", "#EADCA8", "#BEDDC9", "#F3C3A2"];
const MOUTH: Record<number, string> = { 1: "M8 16.8q4-3.6 8 0", 2: "M8.5 16.2q3.5-1.8 7 0", 3: "M8.5 15.5h7", 4: "M8.5 14.5q3.5 2.6 7 0", 5: "M7.8 13.8q4.2 4.6 8.4 0" };

export function Face({ level, size = 40, title }: { level: number; size?: number; title?: boolean }) {
  const l = Math.max(1, Math.min(5, Math.round(level)));
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title ? MOOD_NAMES[l - 1] : undefined}>
      <circle cx="12" cy="12" r="10.3" fill={FACE_FILL[l - 1]} stroke="#1E1B16" strokeWidth="1.2" />
      <circle cx="9" cy="10" r="1.1" fill="#1E1B16" />
      <circle cx="15" cy="10" r="1.1" fill="#1E1B16" />
      <path d={MOUTH[l]} fill="none" stroke="#1E1B16" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Check({ done, onClick, label, disabled }: { done: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" className="check" aria-pressed={done} aria-label={done ? `${label}, done. Mark not done` : `Mark ${label} done`} onClick={onClick} disabled={disabled}>
      <span>{done && <Icon name="check" size={17} stroke={2.6} />}</span>
    </button>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" className="toggle" aria-pressed={on} aria-label={label} onClick={() => onChange(!on)} />;
}

export function Seg<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function SegLinks({ items, current }: { items: { href: string; label: string }[]; current: string }) {
  return (
    <nav className="seg" aria-label="Sections">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.href === current ? "page" : undefined}>{i.label}</Link>
      ))}
    </nav>
  );
}

export function Header({ title, sub, back, right, small }: { title: string; sub?: React.ReactNode; back?: string; right?: React.ReactNode; small?: boolean }) {
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {back && (
        <Link href={back} className="icon-btn" aria-label="Back"><Icon name="chevL" /></Link>
      )}
      <div className="grow">
        <h1 className={small ? "h2" : "h1"}>{title}</h1>
        {sub && <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>{sub}</div>}
      </div>
      {right && <div style={{ display: "flex", gap: 8 }}>{right}</div>}
    </header>
  );
}

export function Loading({ text = "Loading…" }: { text?: string }) {
  return <div className="loading" role="status">{text}</div>;
}

export function ErrorBox({ msg, retry }: { msg: string; retry?: () => void }) {
  return (
    <div className="card" role="alert">
      <div className="error">{msg}</div>
      {retry && <button type="button" className="btn sm" onClick={retry}>Try again</button>}
    </div>
  );
}

export function Toast({ msg }: { msg: string | null }) {
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}

export function Bar({ pct, color, track }: { pct: number; color?: string; track?: string }) {
  return (
    <div className="bar" style={track ? { background: track } : undefined}>
      <span style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

export function Stepper({ value, onChange, min = 1, max = 100, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="counter">
      <button type="button" className="icon-btn sm" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - 1))}><Icon name="minus" size={18} /></button>
      <b aria-live="polite">{value}</b>
      <button type="button" className="icon-btn sm" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, value + 1))}><Icon name="plus" size={18} /></button>
    </div>
  );
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

/** A 12-hour time picker (hour, minute, AM/PM). Reads and writes "HH:mm", or "" for no time. */
export function TimeInput({ id, value, onChange, label, optional = true }: { id?: string; value: string; onChange: (v: string) => void; label?: string; optional?: boolean }) {
  const [h24, min] = value ? value.split(":") : ["", ""];
  const hour = h24 === "" ? "" : String(Number(h24) % 12 || 12);
  // Remembers AM/PM while no hour is picked yet.
  const [pickedPm, setPickedPm] = useState(false);
  const pm = h24 === "" ? pickedPm : Number(h24) >= 12;
  const minutes = min && !MINUTES.includes(min) ? [...MINUTES, min].sort() : MINUTES;

  function emit(nextHour: string, nextMin: string, nextPm: boolean) {
    if (!nextHour) return onChange("");
    const h = (Number(nextHour) % 12) + (nextPm ? 12 : 0);
    onChange(`${String(h).padStart(2, "0")}:${nextMin || "00"}`);
  }
  const name = label ?? "Time";
  return (
    <div className="time-input" role="group" aria-label={name}>
      <select id={id} className="input" aria-label={`${name} hour`} value={hour} onChange={(e) => emit(e.target.value, min, pm)}>
        {optional && <option value="">--</option>}
        {HOURS.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <span aria-hidden="true">:</span>
      <select className="input" aria-label={`${name} minute`} value={min || "00"} disabled={!hour} onChange={(e) => emit(hour, e.target.value, pm)}>
        {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <select className="input" aria-label={`${name} AM or PM`} value={pm ? "PM" : "AM"} onChange={(e) => { const p = e.target.value === "PM"; setPickedPm(p); emit(hour, min, p); }}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

export function TimePair({ from, to, onFrom, onTo, idPrefix, fromLabel = "From", toLabel = "To" }: {
  from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; idPrefix: string; fromLabel?: string; toLabel?: string;
}) {
  return (
    <div className="time-pair">
      <div className="field">
        <label htmlFor={`${idPrefix}-from`}>{fromLabel}</label>
        <TimeInput id={`${idPrefix}-from`} label={fromLabel} value={from} onChange={onFrom} />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-to`}>{toLabel}</label>
        <TimeInput id={`${idPrefix}-to`} label={toLabel} value={to} onChange={onTo} />
      </div>
    </div>
  );
}

const DAY_BTNS = [
  { d: 1, l: "M", n: "Monday" }, { d: 2, l: "T", n: "Tuesday" }, { d: 3, l: "W", n: "Wednesday" }, { d: 4, l: "T", n: "Thursday" },
  { d: 5, l: "F", n: "Friday" }, { d: 6, l: "S", n: "Saturday" }, { d: 0, l: "S", n: "Sunday" },
];

export function DayPicker({ days, onChange }: { days: number[]; onChange: (d: number[]) => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }} role="group" aria-label="Days">
      {DAY_BTNS.map((b) => {
        const on = days.includes(b.d);
        return (
          <button key={b.d} type="button" aria-label={b.n} aria-pressed={on} onClick={() => onChange(on ? days.filter((x) => x !== b.d) : [...days, b.d])}
            style={{ width: 42, height: 42, borderRadius: "50%", border: `1.5px solid ${on ? "var(--acc)" : "var(--line)"}`, background: on ? "var(--acc)" : "var(--surf)", color: on ? "var(--on-acc)" : "var(--ink)", fontWeight: 600 }}>
            {b.l}
          </button>
        );
      })}
    </div>
  );
}

/** A bottom sheet over the page. Closes on Escape or a tap outside. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="between">
          <h2 className="sheet-title">{title}</h2>
          <button type="button" className="icon-btn sm" aria-label="Close" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const SWIPE_OPEN = "bloom-swipe-open";

/** A list row that slides left to show action buttons, like in Mail. */
export function SwipeRow({ children, actions, label }: { children: React.ReactNode; actions: { label: string; icon: string; tone?: "danger"; onClick: () => void }[]; label: string }) {
  const width = actions.length * 76;
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const id = useRef(Math.random().toString(36));
  const start = useRef<{ x: number; y: number; base: number; horizontal: boolean | null } | null>(null);
  const dragged = useRef(false);

  // Only one row stays open at a time.
  useEffect(() => {
    const close = (e: Event) => (e as CustomEvent).detail !== id.current && setX(0);
    window.addEventListener(SWIPE_OPEN, close);
    return () => window.removeEventListener(SWIPE_OPEN, close);
  }, []);
  const open = () => {
    setX(-width);
    window.dispatchEvent(new CustomEvent(SWIPE_OPEN, { detail: id.current }));
  };

  function down(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragged.current = false;
    start.current = { x: e.clientX, y: e.clientY, base: x, horizontal: null };
  }
  function move(e: React.PointerEvent) {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.horizontal === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.horizontal = Math.abs(dx) > Math.abs(dy);
      if (!s.horizontal) return (start.current = null);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragged.current = true;
      setDragging(true);
    }
    setX(Math.max(-width - 24, Math.min(0, s.base + dx)));
  }
  function up() {
    const s = start.current;
    start.current = null;
    if (!s?.horizontal) return;
    setDragging(false);
    if (x < -width / 2) open();
    else setX(0);
  }

  return (
    <div className="swipe">
      <div className="swipe-actions" style={{ width, visibility: x === 0 && !dragging ? "hidden" : "visible" }} aria-label={`Actions for ${label}`} role="group">
        {actions.map((a) => (
          <button key={a.label} type="button" className={`swipe-btn ${a.tone ?? ""}`} tabIndex={x === 0 ? -1 : 0}
            onClick={() => { setX(0); a.onClick(); }}>
            <Icon name={a.icon} size={20} />{a.label}
          </button>
        ))}
      </div>
      <div className="swipe-content" style={{ transform: `translateX(${x}px)`, transition: dragging ? "none" : undefined }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClickCapture={(e) => {
          // A tap on an open row closes it, and the click that ends a drag does nothing.
          if (dragged.current || x !== 0) {
            e.stopPropagation();
            e.preventDefault();
            if (!dragged.current) setX(0);
          }
          dragged.current = false;
        }}>
        {children}
        <button type="button" className="icon-btn sm swipe-more" aria-label={`More actions for ${label}`} aria-expanded={x !== 0}
          onClick={(e) => { e.stopPropagation(); if (x === 0) open(); else setX(0); }}>
          <Icon name="more" size={18} />
        </button>
      </div>
    </div>
  );
}
