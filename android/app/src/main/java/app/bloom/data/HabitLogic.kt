package app.bloom.data

// Scheduling and streak rules, ported from the web app's lib/habitLogic.ts and lib/todos.ts.

typealias Counts = Map<String, Int>

object HabitLogic {
    fun isScheduled(h: Habit, key: String): Boolean {
        if (h.startDate.isNotEmpty() && key < h.startDate) return false
        if (h.repeat == "days") return h.days.contains(Dates.dow(key))
        return true
    }

    fun doneOn(h: Habit, counts: Counts, key: String) = (counts[key] ?: 0) >= maxOf(1, h.goal)

    /** Completed days in the week of `key`, up to and including `key`. */
    fun weekDone(h: Habit, counts: Counts, key: String): Int {
        val ws = Dates.weekStart(key)
        var n = 0
        for (i in 0 until 7) {
            val k = Dates.add(ws, i)
            if (k > key) break
            if (doneOn(h, counts, k)) n++
        }
        return n
    }

    data class Streak(val current: Int, val best: Int, val unit: String)

    fun streaks(h: Habit, counts: Counts, today: String): Streak {
        val floor = if (h.startDate.isNotEmpty() && h.startDate <= today) h.startDate else Dates.add(today, -400)
        if (h.repeat == "weekly") {
            val target = maxOf(1, h.timesPerWeek)
            fun met(ws: String) = (0 until 7).count { doneOn(h, counts, Dates.add(ws, it)) } >= target
            val firstWeek = Dates.weekStart(floor)
            val thisWeek = Dates.weekStart(today)
            var ws = thisWeek
            if (!met(ws)) ws = Dates.add(ws, -7)
            var current = 0
            while (ws >= firstWeek && met(ws)) {
                current++
                ws = Dates.add(ws, -7)
            }
            var best = 0
            var run = 0
            var w = firstWeek
            while (w <= thisWeek) {
                if (met(w)) {
                    run++
                    best = maxOf(best, run)
                } else if (w != thisWeek) run = 0
                w = Dates.add(w, 7)
            }
            return Streak(current, maxOf(best, current), "week")
        }
        var k = today
        if (isScheduled(h, k) && !doneOn(h, counts, k)) k = Dates.add(k, -1)
        var current = 0
        while (k >= floor) {
            if (isScheduled(h, k)) {
                if (doneOn(h, counts, k)) current++ else break
            }
            k = Dates.add(k, -1)
        }
        var best = 0
        var run = 0
        var d = floor
        while (d <= today) {
            if (isScheduled(h, d)) {
                if (doneOn(h, counts, d)) {
                    run++
                    best = maxOf(best, run)
                } else if (d != today) run = 0
            }
            d = Dates.add(d, 1)
        }
        return Streak(current, maxOf(best, current), "day")
    }

    /** Share of scheduled days completed over the last `days` days (0–100). */
    fun completionRate(h: Habit, counts: Counts, today: String, days: Int = 30): Int? {
        var scheduled = 0
        var done = 0
        for (i in 0 until days) {
            val k = Dates.add(today, -i)
            if (h.startDate.isNotEmpty() && k < h.startDate) break
            if (h.repeat == "weekly") {
                if (doneOn(h, counts, k)) done++
                continue
            }
            if (!isScheduled(h, k)) continue
            if (k == today && !doneOn(h, counts, k)) continue
            scheduled++
            if (doneOn(h, counts, k)) done++
        }
        if (h.repeat == "weekly") {
            val weeks = maxOf(1, Math.round(days / 7f))
            return minOf(100, Math.round(done * 100f / (weeks * maxOf(1, h.timesPerWeek))))
        }
        return if (scheduled > 0) Math.round(done * 100f / scheduled) else null
    }

    fun repeatLabel(h: Habit): String = when (h.repeat) {
        "daily" -> "Every day"
        "weekly" -> "${h.timesPerWeek}× a week"
        else -> daysLabel(h.days)
    }

    fun daysLabel(days: List<Int>): String {
        val d = days.sortedBy { (it + 6) % 7 }
        if (d.size == 7) return "Every day"
        if (d.size == 5 && 0 !in d && 6 !in d) return "Weekdays"
        if (d.size == 2 && 0 in d && 6 in d) return "Weekends"
        return d.joinToString(", ") { Dates.WEEKDAYS[it] }
    }

    fun byTime(a: String, b: String): Int = when {
        a.isEmpty() && b.isEmpty() -> 0
        a.isEmpty() -> 1
        b.isEmpty() -> -1
        else -> a.compareTo(b)
    }

    // Water habits and the Health water count stay in step.
    fun isWaterHabit(h: Habit) = h.unit.contains("glass", true) || (h.icon == "drop" && h.name.contains("water", true))
}

object TodoLogic {
    fun repeats(t: Todo) = t.repeat == "daily" || t.repeat == "days"

    /** Whether a to-do shows up on a given day. */
    fun occursOn(t: Todo, date: String): Boolean {
        if (date < t.date || (t.endDate.isNotEmpty() && date > t.endDate) || date in t.skipDates) return false
        if (!repeats(t)) return if (t.endDate.isNotEmpty()) true else t.date == date
        return t.repeat == "daily" || t.days.contains(Dates.dow(date))
    }

    fun doneOn(t: Todo, date: String) = if (repeats(t)) date in t.doneDates else t.done
}

/** A habit as it looks on one day. */
data class HabitDay(
    val habit: Habit,
    val count: Int,
    val done: Boolean,
    val scheduled: Boolean,
    val streak: Int,
    val best: Int,
    val streakUnit: String,
    val weekDone: Int,
)

fun countsByHabit(logs: List<HabitLog>): Map<Long, Counts> =
    logs.groupBy { it.habitId }.mapValues { (_, l) -> l.associate { it.date to it.count } }

fun habitDay(h: Habit, counts: Counts, key: String): HabitDay {
    val count = counts[key] ?: 0
    val s = HabitLogic.streaks(h, counts, key)
    return HabitDay(h, count, count >= maxOf(1, h.goal), HabitLogic.isScheduled(h, key), s.current, s.best, s.unit, HabitLogic.weekDone(h, counts, key))
}

/** The best mood check-in of each day. On ties, the latest one. */
fun bestByDate(moods: List<Mood>): Map<String, Mood> {
    val best = HashMap<String, Mood>()
    for (m in moods) {
        val b = best[m.date]
        if (b == null || m.level > b.level || (m.level == b.level && m.time > b.time)) best[m.date] = m
    }
    return best
}
