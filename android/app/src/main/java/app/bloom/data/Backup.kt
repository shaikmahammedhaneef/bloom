package app.bloom.data

import org.json.JSONArray
import org.json.JSONObject

// With no account there's no cloud copy, so the app offers a full backup file
// (JSON) you can keep anywhere, and CSV exports like the web app had.
object Backup {
    private fun ints(v: List<Int>) = JSONArray(v)
    private fun strs(v: List<String>) = JSONArray(v)
    private fun JSONObject.ints(k: String) = optJSONArray(k)?.let { a -> List(a.length()) { a.getInt(it) } } ?: emptyList()
    private fun JSONObject.strs(k: String) = optJSONArray(k)?.let { a -> List(a.length()) { a.getString(it) } } ?: emptyList()
    private fun <T> JSONArray?.map(f: (JSONObject) -> T): List<T> = if (this == null) emptyList() else List(length()) { f(getJSONObject(it)) }

    suspend fun export(dao: BloomDao, s: Settings): String {
        val o = JSONObject()
        o.put("app", "bloom")
        o.put("version", 1)
        o.put("settings", JSONObject().apply {
            put("name", s.name); put("goals", strs(s.goals)); put("recharge", s.recharge); put("roleModel", s.roleModel)
            put("accent", s.accent); put("theme", s.theme); put("waterGoal", s.waterGoal); put("stepGoal", s.stepGoal)
            put("remindRoutine", s.remindRoutine); put("remindMood", s.remindMood); put("moodTime", s.moodTime)
            put("remindStreak", s.remindStreak); put("streakTime", s.streakTime)
            put("alarmVibrate", s.alarmVibrate); put("alarmMinutes", s.alarmMinutes)
        })
        o.put("habits", JSONArray(dao.habits().map { h ->
            JSONObject().apply {
                put("id", h.id); put("name", h.name); put("icon", h.icon); put("color", h.color); put("category", h.category)
                put("startTime", h.startTime); put("endTime", h.endTime); put("repeat", h.repeat); put("timesPerWeek", h.timesPerWeek)
                put("days", ints(h.days)); put("goal", h.goal); put("unit", h.unit); put("reminder", h.reminder); put("startDate", h.startDate); put("createdAt", h.createdAt)
                put("skipDates", strs(h.skipDates)); put("endDate", h.endDate); put("alarm", h.alarm); put("alarmTone", h.alarmTone)
            }
        }))
        o.put("habitLogs", JSONArray(dao.allLogs().map { JSONObject().put("habitId", it.habitId).put("date", it.date).put("count", it.count) }))
        o.put("todos", JSONArray(dao.todos().map { t ->
            JSONObject().apply {
                put("id", t.id); put("title", t.title); put("date", t.date); put("endDate", t.endDate); put("startTime", t.startTime); put("endTime", t.endTime)
                put("done", t.done); put("reminder", t.reminder); put("repeat", t.repeat); put("days", ints(t.days)); put("doneDates", strs(t.doneDates)); put("skipDates", strs(t.skipDates)); put("createdAt", t.createdAt)
                put("alarm", t.alarm); put("alarmTone", t.alarmTone)
            }
        }))
        o.put("moods", JSONArray(dao.moods().map { m ->
            JSONObject().put("id", m.id).put("date", m.date).put("time", m.time).put("level", m.level).put("emotions", strs(m.emotions)).put("triggers", strs(m.triggers)).put("note", m.note)
        }))
        o.put("journal", JSONArray(dao.journals().map { JSONObject().put("date", it.date).put("prompt", it.prompt).put("text", it.text).put("gratitude", strs(it.gratitude)) }))
        o.put("health", JSONArray(dao.healthAll().map { h ->
            JSONObject().put("date", h.date).put("water", h.water).put("steps", h.steps).put("weight", h.weight ?: JSONObject.NULL).put("sleepStart", h.sleepStart).put("sleepEnd", h.sleepEnd)
        }))
        o.put("sessions", JSONArray(dao.sessions().map { JSONObject().put("id", it.id).put("date", it.date).put("type", it.type).put("minutes", it.minutes).put("label", it.label) }))
        o.put("challenges", JSONArray(dao.challenges().map { JSONObject().put("id", it.id).put("key", it.key).put("startDate", it.startDate).put("doneDates", strs(it.doneDates)).put("status", it.status) }))
        return o.toString(2)
    }

    /** Replaces everything with the backup. Throws if the file isn't a Bloom backup. */
    suspend fun restore(dao: BloomDao, store: SettingsStore, json: String) {
        val o = JSONObject(json)
        require(o.optString("app") == "bloom") { "That file isn't a Bloom backup." }
        val habits = o.optJSONArray("habits").map {
            Habit(it.getLong("id"), it.getString("name"), it.optString("icon", "check"), it.optString("color", "sage"), it.optString("category", "health"),
                it.optString("startTime"), it.optString("endTime"), it.optString("repeat", "daily"), it.optInt("timesPerWeek", 3), it.ints("days"),
                it.optInt("goal", 1), it.optString("unit"), it.optBoolean("reminder"), it.optString("startDate"), it.optLong("createdAt"),
                it.strs("skipDates"), it.optString("endDate"), it.optBoolean("alarm"), it.optString("alarmTone"))
        }
        val logs = o.optJSONArray("habitLogs").map { HabitLog(it.getLong("habitId"), it.getString("date"), it.getInt("count")) }
        val todos = o.optJSONArray("todos").map {
            Todo(it.getLong("id"), it.getString("title"), it.getString("date"), it.optString("endDate"), it.optString("startTime"), it.optString("endTime"),
                it.optBoolean("done"), it.optBoolean("reminder"), it.optString("repeat", "none"), it.ints("days"), it.strs("doneDates"), it.strs("skipDates"), it.optLong("createdAt"),
                it.optBoolean("alarm"), it.optString("alarmTone"))
        }
        val moods = o.optJSONArray("moods").map { Mood(it.getLong("id"), it.getString("date"), it.optString("time"), it.getInt("level"), it.strs("emotions"), it.strs("triggers"), it.optString("note")) }
        val journal = o.optJSONArray("journal").map { Journal(it.getString("date"), it.optString("prompt"), it.optString("text"), it.strs("gratitude")) }
        val health = o.optJSONArray("health").map {
            Health(it.getString("date"), it.optInt("water"), it.optInt("steps"), if (it.isNull("weight")) null else it.optDouble("weight"), it.optString("sleepStart"), it.optString("sleepEnd"))
        }
        val sessions = o.optJSONArray("sessions").map { FocusSession(it.getLong("id"), it.getString("date"), it.getString("type"), it.optInt("minutes"), it.optString("label")) }
        val challenges = o.optJSONArray("challenges").map { UserChallenge(it.getLong("id"), it.getString("key"), it.getString("startDate"), it.strs("doneDates"), it.optString("status", "active")) }

        dao.clearHabits(); dao.clearLogs(); dao.clearTodos(); dao.clearMoods(); dao.clearJournal(); dao.clearHealth(); dao.clearSessions(); dao.clearChallenges()
        dao.putHabits(habits); dao.putLogs(logs); dao.putTodos(todos); dao.putMoods(moods); dao.putJournals(journal); dao.putHealth(health); dao.putSessions(sessions); dao.putChallenges(challenges)

        o.optJSONObject("settings")?.let { s ->
            store.update {
                it.copy(
                    onboarded = true, name = s.optString("name", it.name), goals = s.strs("goals"), recharge = s.optString("recharge"), roleModel = s.optString("roleModel"),
                    accent = s.optString("accent", it.accent), theme = s.optString("theme", it.theme), waterGoal = s.optInt("waterGoal", it.waterGoal), stepGoal = s.optInt("stepGoal", it.stepGoal),
                    remindRoutine = s.optBoolean("remindRoutine", it.remindRoutine), remindMood = s.optBoolean("remindMood", it.remindMood), moodTime = s.optString("moodTime", it.moodTime),
                    remindStreak = s.optBoolean("remindStreak", it.remindStreak), streakTime = s.optString("streakTime", it.streakTime),
                    alarmVibrate = s.optBoolean("alarmVibrate", it.alarmVibrate), alarmMinutes = s.optInt("alarmMinutes", it.alarmMinutes),
                )
            }
        }
    }

    private fun esc(v: Any?): String {
        val s = when (v) { null -> ""; is List<*> -> v.joinToString("; "); else -> v.toString() }
        return if (s.contains(',') || s.contains('"') || s.contains('\n')) "\"" + s.replace("\"", "\"\"") + "\"" else s
    }

    private fun csv(headers: List<String>, rows: List<List<Any?>>) =
        (listOf(headers.joinToString(",")) + rows.map { r -> r.joinToString(",") { esc(it) } }).joinToString("\n")

    val CSV_KINDS = listOf("habits" to "Habit check-offs", "moods" to "Mood check-ins", "journal" to "Journal", "todos" to "To-dos", "health" to "Health", "sessions" to "Breathing and focus")

    suspend fun csv(dao: BloomDao, kind: String): String = when (kind) {
        "habits" -> {
            val byId = dao.habits().associateBy { it.id }
            csv(listOf("date", "habit", "from", "to", "count", "goal", "done"), dao.allLogs().map { l ->
                val h = byId[l.habitId]; val goal = maxOf(1, h?.goal ?: 1)
                listOf(l.date, h?.name, h?.startTime, h?.endTime, l.count, goal, if (l.count >= goal) "yes" else "no")
            })
        }
        "moods" -> csv(listOf("date", "time", "level", "emotions", "triggers", "note"), dao.moods().map { listOf(it.date, it.time, it.level, it.emotions, it.triggers, it.note) })
        "journal" -> csv(listOf("date", "prompt", "text", "gratitude"), dao.journals().map { listOf(it.date, it.prompt, it.text, it.gratitude) })
        "todos" -> csv(listOf("date", "startTime", "endTime", "title", "done", "repeat"), dao.todos().map { listOf(it.date, it.startTime, it.endTime, it.title, it.done, it.repeat) })
        "health" -> csv(listOf("date", "water", "steps", "weight", "sleepStart", "sleepEnd"), dao.healthAll().map { listOf(it.date, it.water, it.steps, it.weight, it.sleepStart, it.sleepEnd) })
        else -> csv(listOf("date", "type", "minutes", "label"), dao.sessions().map { listOf(it.date, it.type, it.minutes, it.label) })
    }
}
