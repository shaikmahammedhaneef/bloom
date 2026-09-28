import { dbConnect } from "./db";
import { pushConfigured, sendDueReminders } from "./pushServer";

const g = globalThis as unknown as { _bloomWorker?: boolean };

export function startReminderWorker() {
  if (g._bloomWorker) return;
  if (!pushConfigured()) {
    console.warn("REMINDER_WORKER is on, but VAPID keys are missing, so push reminders are off.");
    return;
  }
  g._bloomWorker = true;
  const run = async () => {
    try {
      await dbConnect();
      await sendDueReminders();
    } catch (e) {
      console.error("Reminder worker:", e);
    }
  };
  // Start a few seconds into the next minute, then run every minute.
  setTimeout(() => {
    run();
    setInterval(run, 60_000);
  }, 60_000 - (Date.now() % 60_000) + 5_000);
  console.log("Bloom reminder worker started.");
}
