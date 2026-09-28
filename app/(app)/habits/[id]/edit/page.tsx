"use client";
import { useParams } from "next/navigation";
import HabitForm from "@/components/HabitForm";
import { ErrorBox, Header, Loading } from "@/components/ui";
import { useApi } from "@/lib/client";
import { toKey } from "@/lib/dates";
import type { Habit } from "@/lib/types";

export default function EditHabitPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useApi<{ habit: Habit }>(`/api/habits/${id}?today=${toKey()}`);
  return (
    <main className="shell">
      <Header title="Edit habit" back={`/habits/${id}`} small />
      {error ? <ErrorBox msg={error} retry={reload} /> : data ? <HabitForm initial={data.habit} /> : <Loading />}
    </main>
  );
}
