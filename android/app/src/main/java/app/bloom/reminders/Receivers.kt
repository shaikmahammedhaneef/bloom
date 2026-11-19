package app.bloom.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import app.bloom.BloomApp
import app.bloom.data.Dates
import app.bloom.data.Mood
import app.bloom.data.TodoLogic
import kotlinx.coroutines.launch

/** Runs `block` off the main thread while keeping the receiver alive. */
private fun BroadcastReceiver.async(context: Context, block: suspend (BloomApp) -> Unit) {
    val pending = goAsync()
    val app = context.applicationContext as BloomApp
    app.scope.launch {
        try {
            block(app)
        } finally {
            pending.finish()
        }
    }
}

/** An alarm went off: show the reminder, or roll the schedule forward at midnight. */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = async(context) { app ->
        if (intent.action == Reminders.ACTION_ROLLOVER) {
            Reminders.reschedule(app)
            return@async
        }
        val key = intent.getStringExtra("key") ?: return@async
        val kind = intent.getStringExtra("kind") ?: return@async
        val date = intent.getStringExtra("date") ?: return@async
        Reminders.fire(app, key, kind, intent.getLongExtra("refId", 0), date)
    }
}

/** Buttons on a reminder: Done, +1, Snooze, or a mood. They work without opening the app. */
class ActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = async(context) { app ->
        val key = intent.getStringExtra("key") ?: return@async
        val kind = intent.getStringExtra("kind") ?: return@async
        val refId = intent.getLongExtra("refId", 0)
        val date = intent.getStringExtra("date") ?: return@async
        val nm = NotificationManagerCompat.from(app)
        val repo = app.repo
        val dao = repo.dao
        when (intent.action) {
            "app.bloom.DONE" -> {
                if (kind == "habit") dao.habit(refId)?.let { repo.setCount(it, date, maxOf(1, it.goal)) }
                if (kind == "todo") dao.todo(refId)?.let { if (!TodoLogic.doneOn(it, date)) repo.toggleTodo(it, date) }
                nm.cancel(Reminders.notificationId(key))
            }
            "app.bloom.PLUS" -> {
                val h = dao.habit(refId) ?: return@async
                repo.addCount(h, date, 1)
                // Update the same notification quietly, or clear it once the goal is met.
                val count = dao.log(h.id, date)?.count ?: 0
                if (count >= maxOf(1, h.goal)) nm.cancel(Reminders.notificationId(key))
                else Reminders.fire(app, key, kind, refId, date, quiet = true)
            }
            "app.bloom.SNOOZE" -> {
                nm.cancel(Reminders.notificationId(key))
                Reminders.snooze(app, key.removePrefix("z:"), kind, refId, date, app.settings.value.snoozeMinutes)
            }
            "app.bloom.MOOD" -> {
                val level = intent.getIntExtra("extra", 0)
                if (level in 1..5) repo.saveMood(Mood(date = date, time = if (date == Dates.today()) Dates.nowTime() else "21:00", level = level))
                nm.cancel(Reminders.notificationId(key))
            }
        }
    }
}

/** After a reboot, an app update, or a clock or time-zone change, set the alarms again. */
class RescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = async(context) { Reminders.reschedule(it) }
}
