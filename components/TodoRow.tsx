"use client";
import { Check } from "./ui";
import { fmtShort, timeRange } from "@/lib/dates";
import type { Todo } from "@/lib/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function repeatLabel(t: Todo) {
  if (t.repeat === "daily") return "Every day";
  if (t.repeat === "days") return [1, 2, 3, 4, 5, 6, 0].filter((d) => t.days.includes(d)).map((d) => DAY_NAMES[d]).join(", ");
  return "";
}

export default function TodoRow({ t, onToggle }: { t: Todo; onToggle: () => void }) {
  const span = t.endDate ? (t.repeat === "none" ? `${fmtShort(t.startDate)} – ${fmtShort(t.endDate)}` : `until ${fmtShort(t.endDate)}`) : "";
  const meta = [t.startTime ? timeRange(t.startTime, t.endTime) : "No set time", repeatLabel(t), span, t.reminder && t.startTime ? "Reminder on" : ""];
  return (
    <div className="row">
      <Check done={t.done} label={t.title} onClick={onToggle} />
      <div className="grow">
        <div className={`row-title ${t.done ? "done-text" : ""}`}>{t.title}</div>
        <div className="row-meta">{meta.filter(Boolean).join("  ·  ")}</div>
      </div>
    </div>
  );
}
