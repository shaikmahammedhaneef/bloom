package app.bloom.data

// Understands a little plain English in the quick-add box, so "Call mom at 6pm
// tomorrow" or "Drink water every day 9am" fills in the time, day and repeat.
object QuickAdd {
    data class Parsed(val title: String, val time: String?, val tomorrow: Boolean, val daily: Boolean, val weekdays: Boolean)

    private val ampm = Regex("""\b(?:at\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?=\W|$)""", RegexOption.IGNORE_CASE)
    private val h24 = Regex("""\b(?:at\s+)?([01]?\d|2[0-3])[:.]([0-5]\d)\b""", RegexOption.IGNORE_CASE)
    private val tomorrowRx = Regex("""\btomorrow\b""", RegexOption.IGNORE_CASE)
    private val todayRx = Regex("""\btoday\b""", RegexOption.IGNORE_CASE)
    private val dailyRx = Regex("""\b(every\s*day|daily|everyday)\b""", RegexOption.IGNORE_CASE)
    private val weekdaysRx = Regex("""\b(on\s+)?(weekdays|every\s+weekday)\b""", RegexOption.IGNORE_CASE)

    fun parse(text: String): Parsed {
        var t = text
        var time: String? = null
        ampm.find(t)?.let { m ->
            val h = m.groupValues[1].toInt()
            val min = m.groupValues[2].ifEmpty { "0" }.toInt()
            if (h in 1..12 && min in 0..59) {
                val pm = m.groupValues[3].lowercase().startsWith("p")
                val hh = (h % 12) + if (pm) 12 else 0
                time = "%02d:%02d".format(hh, min)
                t = t.removeRange(m.range)
            }
        }
        if (time == null) h24.find(t)?.let { m ->
            time = "%02d:%02d".format(m.groupValues[1].toInt(), m.groupValues[2].toInt())
            t = t.removeRange(m.range)
        }
        val tomorrow = tomorrowRx.containsMatchIn(t)
        val daily = dailyRx.containsMatchIn(t)
        val weekdays = weekdaysRx.containsMatchIn(t)
        for (rx in listOf(tomorrowRx, todayRx, dailyRx, weekdaysRx)) t = rx.replace(t, " ")
        val title = t.replace(Regex("""\s+"""), " ").trim().trimEnd(',', '-', '.').trim().replaceFirstChar { it.uppercase() }
        return Parsed(title, time, tomorrow, daily, weekdays)
    }

    /** Picks an icon and color from words in a habit's name. */
    fun guessIcon(name: String): Pair<String, String> {
        val n = name.lowercase()
        val rules = listOf(
            listOf("water", "drink", "hydrat") to ("drop" to "sky"),
            listOf("read", "book", "study", "learn") to ("book" to "lilac"),
            listOf("walk", "step", "run", "jog") to ("steps" to "sage"),
            listOf("gym", "workout", "exercise", "push", "lift", "yoga", "stretch") to ("dumbbell" to "peach"),
            listOf("sleep", "bed", "nap") to ("bed" to "sky"),
            listOf("meditat", "breath", "calm") to ("wind" to "sage"),
            listOf("journal", "write", "plan", "diary") to ("pen" to "lilac"),
            listOf("clean", "tidy", "laundry", "dishes", "chore") to ("broom" to "honey"),
            listOf("eat", "breakfast", "lunch", "dinner", "cook", "meal", "fruit", "veg") to ("food" to "peach"),
            listOf("phone", "screen", "social") to ("phone" to "honey"),
            listOf("music", "guitar", "piano", "sing") to ("music" to "rose"),
            listOf("work", "email", "code") to ("work" to "lilac"),
            listOf("wake", "morning", "sun") to ("sun" to "honey"),
            listOf("call", "friend", "family", "mom", "dad") to ("people" to "rose"),
            listOf("skin", "self", "love", "gratitude") to ("heart" to "rose"),
        )
        return rules.firstOrNull { (words, _) -> words.any { it in n } }?.second ?: ("check" to "sage")
    }
}
