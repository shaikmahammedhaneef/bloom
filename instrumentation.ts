// Runs once when the server starts. With REMINDER_WORKER=1 (for a long-running
// `npm start` server), Bloom checks for due push reminders every minute itself,
// so no outside cron job is needed.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.REMINDER_WORKER !== "1") return;
  const { startReminderWorker } = await import("./lib/reminderWorker");
  startReminderWorker();
}
