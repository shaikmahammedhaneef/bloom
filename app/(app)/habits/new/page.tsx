"use client";
import HabitForm from "@/components/HabitForm";
import { Header } from "@/components/ui";

export default function NewHabitPage() {
  return (
    <main className="shell">
      <Header title="New habit" back="/habits" small />
      <HabitForm />
    </main>
  );
}
