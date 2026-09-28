"use client";
// To-do rows. Swipe a row left (or tap ⋯) to edit or delete it. For a
// repeating to-do, Bloom asks whether the change is for this day or all days.
// useTodoActions gives single rows (to mix into other lists) plus the sheets.
import { useCallback, useState, type ReactNode } from "react";
import TodoForm, { type TodoFields } from "./TodoForm";
import TodoRow from "./TodoRow";
import { Sheet, SwipeRow } from "./ui";
import { api } from "@/lib/client";
import type { Todo } from "@/lib/types";

type Scope = "one" | "all";
type Pending = { kind: "edit"; todo: Todo; fields: TodoFields } | { kind: "delete"; todo: Todo };

function ScopeChoice({ pending, onChoose, onCancel }: { pending: Pending; onChoose: (s: Scope) => void; onCancel: () => void }) {
  const del = pending.kind === "delete";
  return (
    <>
      <p className="muted" style={{ margin: 0 }}>“{pending.todo.title}” repeats. {del ? "Delete" : "Change"} it for this day only, or for every day it’s scheduled?</p>
      <button type="button" className="btn block" onClick={() => onChoose("one")}>Only this day</button>
      <button type="button" className={`btn block ${del ? "danger" : "primary"}`} onClick={() => onChoose("all")}>All scheduled</button>
      <button type="button" className="btn ghost block" onClick={onCancel}>Cancel</button>
    </>
  );
}

type Opts = {
  setTodos: (fn: (todos: Todo[]) => Todo[]) => void;
  reload: () => void;
  toast: (m: string) => void;
};

export function useTodoActions({ setTodos, reload, toast }: Opts): { row: (t: Todo) => ReactNode; sheets: ReactNode } {
  const [editing, setEditing] = useState<Todo | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const closeEdit = useCallback(() => setEditing(null), []);
  const closeScope = useCallback(() => setPending(null), []);
  const repeating = (t: Todo) => t.repeat !== "none";

  async function toggle(t: Todo) {
    const done = !t.done;
    setTodos((list) => list.map((x) => (x._id === t._id && x.date === t.date ? { ...x, done } : x)));
    try {
      await api(`/api/todos/${t._id}`, { method: "PATCH", body: { done, on: t.date } });
    } catch (e) {
      toast((e as Error).message);
      reload();
    }
  }

  async function save(t: Todo, fields: TodoFields, scope: Scope) {
    await api(`/api/todos/${t._id}`, { method: "PATCH", body: { ...fields, on: t.date, scope } });
    setEditing(null);
    setPending(null);
    toast(scope === "one" && repeating(t) ? "Changed for this day" : "To-do saved");
    reload();
  }

  async function remove(t: Todo, scope: Scope) {
    try {
      await api(`/api/todos/${t._id}?scope=${scope}&on=${t.date}`, { method: "DELETE" });
      setTodos((list) => list.filter((x) => !(x._id === t._id && (scope === "all" || x.date === t.date))));
      toast(scope === "one" && repeating(t) ? "Removed from this day" : "To-do deleted");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setPending(null);
      reload();
    }
  }

  async function onSave(fields: TodoFields) {
    if (!editing) return;
    if (repeating(editing)) setPending({ kind: "edit", todo: editing, fields });
    else await save(editing, fields, "all");
  }

  function onDelete(t: Todo) {
    if (repeating(t)) setPending({ kind: "delete", todo: t });
    else remove(t, "all");
  }

  async function choose(scope: Scope) {
    if (!pending) return;
    if (pending.kind === "delete") return remove(pending.todo, scope);
    try {
      await save(pending.todo, pending.fields, scope);
    } catch (e) {
      setPending(null);
      toast((e as Error).message);
    }
  }

  const row = (t: Todo) => (
    <SwipeRow key={t._id + t.date} label={t.title} actions={[
      { label: "Edit", icon: "pen", onClick: () => setEditing(t) },
      { label: "Delete", icon: "trash", tone: "danger", onClick: () => onDelete(t) },
    ]}>
      <TodoRow t={t} onToggle={() => toggle(t)} />
    </SwipeRow>
  );

  const sheets = (
    <>
      {editing && (
        <Sheet title={pending ? "Save changes for…" : "Edit to-do"} onClose={closeEdit}>
          {/* The form stays mounted under the scope question, so Cancel returns to it unchanged. */}
          <div hidden={Boolean(pending)}>
            <TodoForm date={editing.date} initial={editing} onSave={onSave} onCancel={closeEdit} />
          </div>
          {pending && <ScopeChoice pending={pending} onChoose={choose} onCancel={closeScope} />}
        </Sheet>
      )}

      {!editing && pending && (
        <Sheet title="Delete…" onClose={closeScope}>
          <ScopeChoice pending={pending} onChoose={choose} onCancel={closeScope} />
        </Sheet>
      )}
    </>
  );

  return { row, sheets };
}

export default function TodoList({ todos, ...opts }: Opts & { todos: Todo[] }) {
  const { row, sheets } = useTodoActions(opts);
  return (
    <>
      <div className="card list">{todos.map(row)}</div>
      {sheets}
    </>
  );
}
