package app.bloom.data

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale

// Days are "yyyy-MM-dd" keys and times are "HH:mm", like the web app.
object Dates {
    fun today(): String = LocalDate.now().toString()
    fun parse(k: String): LocalDate = LocalDate.parse(k)
    fun add(k: String, n: Int): String = parse(k).plusDays(n.toLong()).toString()

    /** 0 = Sunday … 6 = Saturday */
    fun dow(k: String): Int = parse(k).dayOfWeek.value % 7

    /** Monday of the week containing k. */
    fun weekStart(k: String): String = parse(k).with(DayOfWeek.MONDAY).toString()
    fun between(a: String, b: String): Int = ChronoUnit.DAYS.between(parse(a), parse(b)).toInt()
    fun isTime(s: String) = Regex("^([01]\\d|2[0-3]):[0-5]\\d$").matches(s)
    fun nowTime(): String = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))
    fun toMin(t: String): Int = t.split(":").let { it[0].toInt() * 60 + it[1].toInt() }

    /** Minutes between two times; wraps past midnight (23:00 → 07:00 = 8h). */
    fun duration(start: String, end: String): Int? {
        if (start.isBlank() || end.isBlank()) return null
        var d = toMin(end) - toMin(start)
        if (d <= 0) d += 1440
        return d
    }

    fun fmtDur(min: Int): String {
        val h = min / 60
        val m = min % 60
        return if (h == 0) "$m min" else if (m == 0) "${h}h" else "${h}h ${m}m"
    }

    /** "HH:mm" → "7:05 AM". */
    fun fmtTime(t: String): String {
        if (t.isBlank()) return ""
        val (h, m) = t.split(":").map { it.toInt() }
        return "${if (h % 12 == 0) 12 else h % 12}:${m.toString().padStart(2, '0')} ${if (h < 12) "AM" else "PM"}"
    }

    fun timeRange(start: String, end: String): String =
        if (start.isBlank()) "" else if (end.isBlank()) fmtTime(start) else "${fmtTime(start)} – ${fmtTime(end)}"

    fun partOfDay(start: String): String {
        if (start.isBlank()) return "anytime"
        val m = toMin(start)
        return if (m < 12 * 60) "morning" else if (m < 17 * 60) "afternoon" else "evening"
    }

    fun fmtLong(k: String): String = parse(k).format(DateTimeFormatter.ofPattern("EEEE, d MMMM", Locale.getDefault()))
    fun fmtShort(k: String): String = parse(k).format(DateTimeFormatter.ofPattern("d MMM", Locale.getDefault()))
    fun fmtDay(k: String): String = parse(k).format(DateTimeFormatter.ofPattern("EEE, d MMM", Locale.getDefault()))
    fun dayLetter(k: String): String = parse(k).format(DateTimeFormatter.ofPattern("EEE", Locale.getDefault()))

    fun greeting(): String {
        val h = LocalTime.now().hour
        return if (h < 12) "Good morning" else if (h < 17) "Good afternoon" else "Good evening"
    }

    val WEEKDAYS = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
}
