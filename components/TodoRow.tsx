"use client";
import Icon from "./Icon";
import { Check } from "./ui";
import { timeRange } from "@/lib/dates";
import type { Todo } from "@/lib/types";

export default function TodoRow({ t, onToggle, onDelete }: { t: Todo; onToggle: () => void; onDelete?: () => void }) {
  return (
    <div className="row">
      <Check done={t.done} label={t.title} onClick={onToggle} />
      <div className="grow">
        <div className={`row-title ${t.done ? "done-text" : ""}`}>{t.title}</div>
        <div className="row-meta">
          {t.startTime ? timeRange(t.startTime, t.endTime) : "No set time"}
          {t.reminder && t.startTime ? "  ·  Reminder on" : ""}
        </div>
      </div>
      {onDelete && (
        <button type="button" className="icon-btn sm" aria-label={`Delete ${t.title}`} onClick={onDelete}><Icon name="trash" size={18} /></button>
      )}
    </div>
  );
}
