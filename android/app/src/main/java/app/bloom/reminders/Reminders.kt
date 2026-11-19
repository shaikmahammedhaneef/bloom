package app.bloom.reminders

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import app.bloom.BloomApp
import app.bloom.MainActivity
import app.bloom.R
import app.bloom.data.Catalog
import app.bloom.data.Dates
import app.bloom.data.HabitLogic
import app.bloom.data.TodoLogic
import app.bloom.data.countsByHabit
import app.bloom.data.habitDay
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId

// On-device reminders. Nothing goes through a server: alarms are set with
// AlarmManager for today and tomorrow, and set again whenever data changes,
// at midnight, after a reboot and when the time zone changes. When an alarm
// fires, the receiver checks the item is still not done before notifying.
object Reminders {
    const val CH_ROUTINE = "routine"
    const val CH_CHECKIN = "checkin"
    const val CH_ALARM = "alarm"
    const val ACTION_REMIND = "app.bloom.REMIND"
    const val ACTION_ROLLOVER = "app.bloom.ROLLOVER"
    private const val PREFS = "bloom_alarms"

    /** One reminder. kind is "habit", "todo", "mood" or "streak". `alarm` rings instead of a quiet notification. */
    data class Due(val key: String, val at: LocalDateTime, val kind: String, val refId: Long, val date: String, val alarm: Boolean = false)

    fun createChannels(ctx: Context) {
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CH_ROUTINE, "Habit and to-do reminders", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "At the 'from' time of habits and to-dos that have a reminder"
            },
        )
        nm.createNotificationChannel(
            NotificationChannel(CH_ALARM, "Alarms", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Habits and to-dos set to ring as an alarm"
                // Bloom plays the alarm sound itself, so the channel stays silent.
                setSound(null, null)
                enableVibration(false)
            },
        )
        nm.createNotificationChannel(
            NotificationChannel(CH_CHECKIN, "Mood check-in and streaks", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "The daily mood check-in and streak-at-risk nudges"
            },
        )
    }

    fun canNotify(ctx: Context): Boolean =
        (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) &&
            NotificationManagerCompat.from(ctx).areNotificationsEnabled()

    fun canExact(ctx: Context): Boolean =
        Build.VERSION.SDK_INT < 31 || ctx.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()

    /** Every reminder due from now until the end of tomorrow. */
    suspend fun upcoming(app: BloomApp, now: LocalDateTime = LocalDateTime.now()): List<Due> {
        val s = app.settings.value
        if (!s.onboarded) return emptyList()
        val dao = app.repo.dao
        val today = now.toLocalDate().toString()
        val out = mutableListOf<Due>()
        val habits = dao.habits()
        val counts = countsByHabit(dao.logsSince(Dates.add(today, -400)))
        val todos = dao.todos()
        for (date in listOf(today, Dates.add(today, 1))) {
            fun at(t: String) = LocalDateTime.of(LocalDate.parse(date), LocalTime.parse(t))
            if (s.remindRoutine) {
                for (h in habits) {
                    if (!(h.reminder || h.alarm) || h.startTime.isEmpty() || !HabitLogic.isScheduled(h, date)) continue
                    if (HabitLogic.doneOn(h, counts[h.id] ?: emptyMap(), date)) continue
                    out += Due("h:${h.id}:$date", at(h.startTime), "habit", h.id, date, h.alarm)
                }
                for (t in todos) {
                    if (!(t.reminder || t.alarm) || t.startTime.isEmpty() || !TodoLogic.occursOn(t, date) || TodoLogic.doneOn(t, date)) continue
                    out += Due("t:${t.id}:$date", at(t.startTime), "todo", t.id, date, t.alarm)
                }
            }
            if (s.remindMood && !(date == today && dao.moodCount(date) > 0)) out += Due("m:$date", at(s.moodTime), "mood", 0, date)
            if (s.remindStreak) out += Due("s:$date", at(s.streakTime), "streak", 0, date)
        }
        return out.filter { it.at.isAfter(now) }
    }

    @SuppressLint("ScheduleExactAlarm")
    private fun setAlarm(ctx: Context, atMillis: Long, pi: PendingIntent, alarmClock: Boolean = false) {
        val am = ctx.getSystemService(AlarmManager::class.java)
        // Alarm-clock alarms show the alarm icon in the status bar and are never delayed by battery saving.
        if (alarmClock && canExact(ctx)) am.setAlarmClock(AlarmManager.AlarmClockInfo(atMillis, openApp(ctx, "today", 3)), pi)
        else if (canExact(ctx)) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pi)
        // Without the exact-alarm permission Android may deliver a few minutes late.
        else am.setWindow(AlarmManager.RTC_WAKEUP, atMillis, 5 * 60_000L, pi)
    }

    private fun millis(t: LocalDateTime) = t.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

    private fun alarmIntent(ctx: Context, key: String, kind: String, refId: Long, date: String): PendingIntent {
        val i = Intent(ctx, ReminderReceiver::class.java).setAction(ACTION_REMIND)
            .putExtra("key", key).putExtra("kind", kind).putExtra("refId", refId).putExtra("date", date)
        return PendingIntent.getBroadcast(ctx, key.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    suspend fun reschedule(app: BloomApp) {
        val am = app.getSystemService(AlarmManager::class.java)
        val prefs = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        // Cancel what was set last time, then set the current list.
        for (entry in prefs.getStringSet("keys", emptySet())!!) {
            val (key, kind, refId, date) = entry.split("|")
            am.cancel(alarmIntent(app, key, kind, refId.toLong(), date))
        }
        val due = upcoming(app)
        for (d in due) setAlarm(app, millis(d.at), alarmIntent(app, d.key, d.kind, d.refId, d.date), alarmClock = d.alarm)
        prefs.edit().putStringSet("keys", due.map { "${it.key}|${it.kind}|${it.refId}|${it.date}" }.toSet()).apply()

        // Just after midnight, roll the schedule forward a day.
        val roll = PendingIntent.getBroadcast(
            app, 1, Intent(app, ReminderReceiver::class.java).setAction(ACTION_ROLLOVER),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        am.set(AlarmManager.RTC_WAKEUP, millis(LocalDate.now().plusDays(1).atTime(0, 1)), roll)
    }

    fun snooze(ctx: Context, key: String, kind: String, refId: Long, date: String, minutes: Int, alarm: Boolean = false) {
        setAlarm(ctx, System.currentTimeMillis() + minutes * 60_000L, alarmIntent(ctx, "z:$key", kind, refId, date), alarmClock = alarm)
    }

    /** The ongoing notification while an alarm rings. On a locked phone it opens the full-screen alarm. */
    fun alarmNotification(ctx: Context, a: AlarmService.Alarm): android.app.Notification {
        val full = PendingIntent.getActivity(
            ctx, 4242, Intent(ctx, AlarmActivity::class.java).putExtras(a.toIntent(ctx)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val s = (ctx.applicationContext as BloomApp).settings.value
        val b = NotificationCompat.Builder(ctx, CH_ALARM).setSmallIcon(R.drawable.ic_stat_bloom)
            .setContentTitle(a.title).setContentText(a.body.ifBlank { "Alarm" })
            .setCategory(NotificationCompat.CATEGORY_ALARM).setPriority(NotificationCompat.PRIORITY_MAX)
            .setOngoing(true).setFullScreenIntent(full, true).setContentIntent(full)
        if (a.kind == "habit" || a.kind == "todo") b.addAction(0, "Done", action(ctx, "DONE", a.key, a.kind, a.refId, a.date))
        if (a.kind != "test") b.addAction(0, "Snooze ${s.snoozeMinutes} min", action(ctx, "SNOOZE", a.key, a.kind, a.refId, a.date))
        b.addAction(0, "Stop", action(ctx, "DISMISS", a.key, a.kind, a.refId, a.date))
        return b.build()
    }

    /** Whether Android lets Bloom show the alarm full screen on a locked phone (Android 14+ asks). */
    fun canFullScreen(ctx: Context): Boolean =
        Build.VERSION.SDK_INT < 34 || ctx.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()

    fun openApp(ctx: Context, route: String, code: Int): PendingIntent =
        PendingIntent.getActivity(
            ctx, code,
            Intent(ctx, MainActivity::class.java).putExtra("route", route).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    private fun action(ctx: Context, what: String, key: String, kind: String, refId: Long, date: String, extra: Int = 0): PendingIntent {
        val i = Intent(ctx, ActionReceiver::class.java).setAction("app.bloom.$what")
            .putExtra("key", key).putExtra("kind", kind).putExtra("refId", refId).putExtra("date", date).putExtra("extra", extra)
        return PendingIntent.getBroadcast(ctx, (what + key + extra).hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun notificationId(key: String) = key.removePrefix("z:").hashCode()

    /** Starts the ringing alarm. False if Android blocked it, so a normal notification is shown instead. */
    private fun ring(app: BloomApp, a: AlarmService.Alarm): Boolean {
        NotificationManagerCompat.from(app).cancel(notificationId(a.key))
        return AlarmService.start(app, a)
    }

    /** Checks the reminder still applies and shows it. */
    @SuppressLint("MissingPermission")
    suspend fun fire(app: BloomApp, key: String, kind: String, refId: Long, date: String, quiet: Boolean = false, missed: Boolean = false) {
        if (!canNotify(app)) return
        val dao = app.repo.dao
        val s = app.settings.value
        val id = notificationId(key)
        val b: NotificationCompat.Builder
        when (kind) {
            "habit" -> {
                val h = dao.habit(refId) ?: return
                val count = dao.log(h.id, date)?.count ?: 0
                if (count >= maxOf(1, h.goal)) return
                val body = buildString {
                    append(if (missed) "Missed alarm" else if (h.endTime.isNotEmpty()) "Now until ${Dates.fmtTime(h.endTime)}" else "It's time")
                    if (h.goal > 1) append(" · $count of ${h.goal} ${h.unit}".trimEnd())
                }
                if (h.alarm && !missed && ring(app, AlarmService.Alarm(key, kind, refId, date, h.name, body, h.alarmTone.ifBlank { s.alarmTone }))) return
                b = NotificationCompat.Builder(app, CH_ROUTINE).setContentTitle(h.name).setContentText(body)
                    .setContentIntent(openApp(app, "today", id))
                if (h.goal > 1) b.addAction(0, "+1", action(app, "PLUS", key, kind, refId, date))
                b.addAction(0, "Done", action(app, "DONE", key, kind, refId, date))
                b.addAction(0, "Snooze ${s.snoozeMinutes} min", action(app, "SNOOZE", key, kind, refId, date))
            }
            "todo" -> {
                val t = dao.todo(refId) ?: return
                if (!TodoLogic.occursOn(t, date) || TodoLogic.doneOn(t, date)) return
                val body = if (missed) "Missed alarm" else if (t.endTime.isNotEmpty()) "Now until ${Dates.fmtTime(t.endTime)}" else "It's time"
                if (t.alarm && !missed && ring(app, AlarmService.Alarm(key, kind, refId, date, t.title, body, t.alarmTone.ifBlank { s.alarmTone }))) return
                b = NotificationCompat.Builder(app, CH_ROUTINE).setContentTitle(t.title)
                    .setContentText(body)
                    .setContentIntent(openApp(app, "today", id))
                    .addAction(0, "Done", action(app, "DONE", key, kind, refId, date))
                    .addAction(0, "Snooze ${s.snoozeMinutes} min", action(app, "SNOOZE", key, kind, refId, date))
            }
            "mood" -> {
                if (dao.moodCount(date) > 0) return
                b = NotificationCompat.Builder(app, CH_CHECKIN).setContentTitle("How are you feeling?")
                    .setContentText("Tap a mood to log it, or open Bloom to add more.")
                    .setContentIntent(openApp(app, "mood", id))
                for (level in listOf(5, 3, 2)) {
                    b.addAction(0, "${Catalog.MOOD_EMOJI[level - 1]} ${Catalog.MOOD_NAMES[level - 1]}", action(app, "MOOD", key, kind, refId, date, level))
                }
            }
            "streak" -> {
                val counts = countsByHabit(dao.logsSince(Dates.add(date, -400)))
                val atRisk = dao.habits().map { habitDay(it, counts[it.id] ?: emptyMap(), date) }
                    .filter { it.scheduled && !it.done && it.streak >= 3 && it.streakUnit == "day" }
                    .sortedWith { a, c -> HabitLogic.byTime(a.habit.startTime, c.habit.startTime) }
                val top = atRisk.firstOrNull() ?: return
                val more = if (atRisk.size > 1) " (+${atRisk.size - 1} more)" else ""
                b = NotificationCompat.Builder(app, CH_CHECKIN).setContentTitle("Keep your streak going")
                    .setContentText("${top.habit.name} — ${top.streak} days so far$more")
                    .setContentIntent(openApp(app, "today", id))
                    .addAction(0, "Done", action(app, "DONE", "h:${top.habit.id}:$date", "habit", top.habit.id, date))
            }
            else -> return
        }
        b.setSmallIcon(R.drawable.ic_stat_bloom).setAutoCancel(true).setOnlyAlertOnce(quiet)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
        NotificationManagerCompat.from(app).notify(id, b.build())
    }
}

/** A sample notification, so people can see what reminders look like. */
@SuppressLint("MissingPermission")
fun Reminders.test(ctx: Context) {
    if (!canNotify(ctx)) return
    val b = NotificationCompat.Builder(ctx, Reminders.CH_ROUTINE).setSmallIcon(R.drawable.ic_stat_bloom)
        .setContentTitle("Reminders are working").setContentText("Habit and to-do reminders arrive like this, with Done and Snooze buttons.")
        .setContentIntent(openApp(ctx, "today", 7)).setAutoCancel(true)
    NotificationManagerCompat.from(ctx).notify(7, b.build())
}
