package app.bloom.data

import kotlinx.coroutines.flow.Flow

// All reads and writes. Every write calls onChange so reminders are rescheduled.
class Repository(val dao: BloomDao, val settings: SettingsStore, private val onChange: () -> Unit) {

    // ---------- Habits ----------

    fun habitsFlow(): Flow<List<Habit>> = dao.habitsFlow()
    fun habitFlow(id: Long) = dao.habitFlow(id)
    /** Logs far enough back for streaks (400 days). */
    fun logsFlow(today: String): Flow<List<HabitLog>> = dao.logsFlow(Dates.add(today, -400))

    suspend fun saveHabit(h: Habit): Long {
        val clean = h.copy(
            name = h.name.trim().take(80),
            goal = h.goal.coerceIn(1, 100),
            timesPerWeek = h.timesPerWeek.coerceIn(1, 7),
            unit = h.unit.trim().take(20),
            startDate = h.startDate.ifEmpty { Dates.today() },
            endTime = if (h.startTime.isEmpty()) "" else h.endTime,
        )
        val id = if (clean.id == 0L) dao.insertHabit(clean) else clean.id.also { dao.updateHabit(clean) }
        onChange()
        return id
    }

    suspend fun deleteHabit(id: Long) {
        dao.deleteHabit(id)
        dao.deleteLogs(id)
        onChange()
    }

    /** Deletes a habit and returns what's needed to bring it back (for Undo). */
    suspend fun deleteHabitUndoable(id: Long): Pair<Habit, List<HabitLog>>? {
        val h = dao.habit(id) ?: return null
        val logs = dao.logsFor(id)
        deleteHabit(id)
        return h to logs
    }

    suspend fun restoreHabit(saved: Pair<Habit, List<HabitLog>>) {
        dao.putHabits(listOf(saved.first))
        dao.putLogs(saved.second)
        onChange()
    }

    /** Puts a to-do back exactly as it was (after an Undo). */
    suspend fun restoreTodo(t: Todo) {
        dao.putTodos(listOf(t))
        onChange()
    }

    suspend fun restoreMood(m: Mood) {
        dao.putMoods(listOf(m))
        onChange()
    }

    suspend fun setCount(h: Habit, date: String, count: Int) {
        val c = count.coerceIn(0, maxOf(1, h.goal) * 3)
        dao.upsertLog(HabitLog(h.id, date, c))
        if (HabitLogic.isWaterHabit(h)) {
            val cur = dao.health(date) ?: Health(date)
            dao.upsertHealth(cur.copy(water = c))
            syncWaterHabits(date, c, except = h.id)
        }
        onChange()
    }

    suspend fun addCount(h: Habit, date: String, delta: Int) {
        val cur = dao.log(h.id, date)?.count ?: 0
        setCount(h, date, cur + delta)
    }

    /** Tap on a habit: done → not done, otherwise mark it complete. */
    suspend fun toggleHabit(h: Habit, date: String, count: Int) =
        setCount(h, date, if (count >= maxOf(1, h.goal)) 0 else maxOf(1, h.goal))

    private suspend fun syncWaterHabits(date: String, glasses: Int, except: Long = -1) {
        for (w in dao.habits().filter { HabitLogic.isWaterHabit(it) && it.id != except }) {
            dao.upsertLog(HabitLog(w.id, date, minOf(glasses, maxOf(1, w.goal) * 3)))
        }
    }

    /** Adds a template's habits, skipping names you already have. Returns how many were added. */
    suspend fun applyTemplate(key: String, today: String = Dates.today()): Int {
        val t = Catalog.TEMPLATES.firstOrNull { it.key == key } ?: return 0
        val existing = dao.habits().map { it.name.lowercase() }.toSet()
        val now = System.currentTimeMillis()
        val list = t.habits.filter { it.name.lowercase() !in existing }.mapIndexed { i, x ->
            Habit(
                name = x.name, icon = x.icon, color = x.color, category = x.category, startTime = x.startTime, endTime = x.endTime,
                repeat = x.repeat, days = x.days, goal = x.goal, unit = x.unit, reminder = true, startDate = today, createdAt = now + i,
            )
        }
        if (list.isNotEmpty()) dao.insertHabits(list)
        onChange()
        return list.size
    }

    // ---------- To-dos ----------

    fun todosFlow() = dao.todosFlow()

    suspend fun addTodo(t: Todo) {
        dao.insertTodo(t.copy(title = t.title.trim().take(140)))
        onChange()
    }

    suspend fun toggleTodo(t: Todo, date: String) {
        val next = if (TodoLogic.repeats(t)) {
            t.copy(doneDates = if (date in t.doneDates) t.doneDates - date else t.doneDates + date)
        } else t.copy(done = !t.done)
        dao.updateTodo(next)
        onChange()
    }

    /**
     * Saves an edit. For a repeating to-do, `on` is the day being edited and
     * `onlyThisDay` splits that day off as its own one-off to-do.
     */
    suspend fun updateTodo(orig: Todo, edited: Todo, on: String, onlyThisDay: Boolean) {
        val title = edited.title.trim().take(140)
        if (!TodoLogic.repeats(orig)) {
            dao.updateTodo(edited.copy(title = title, days = if (edited.repeat == "days") edited.days else emptyList()))
        } else if (onlyThisDay) {
            dao.insertTodo(
                edited.copy(id = 0, title = title, date = on, endDate = "", repeat = "none", days = emptyList(), doneDates = emptyList(), skipDates = emptyList(), done = on in orig.doneDates, createdAt = System.currentTimeMillis()),
            )
            dao.updateTodo(orig.copy(skipDates = orig.skipDates + on))
        } else if (edited.repeat == "none") {
            // Turning off repeat keeps just the day being edited.
            dao.updateTodo(edited.copy(title = title, date = on, endDate = "", days = emptyList(), done = on in orig.doneDates, doneDates = emptyList(), skipDates = emptyList()))
        } else {
            dao.updateTodo(edited.copy(title = title, date = orig.date, days = if (edited.repeat == "days") edited.days else emptyList()))
        }
        onChange()
    }

    suspend fun deleteTodo(t: Todo, on: String, onlyThisDay: Boolean) {
        if (TodoLogic.repeats(t) && onlyThisDay) dao.updateTodo(t.copy(skipDates = t.skipDates + on, doneDates = t.doneDates - on))
        else dao.deleteTodo(t.id)
        onChange()
    }

    // ---------- Mood and journal ----------

    fun moodsOn(date: String) = dao.moodsOn(date)
    fun moodsSince(from: String) = dao.moodsSince(from)

    suspend fun saveMood(m: Mood) {
        if (m.id == 0L) dao.insertMood(m) else dao.updateMood(m)
        onChange()
    }

    suspend fun deleteMood(m: Mood) {
        dao.deleteMood(m)
        onChange()
    }

    fun journalOn(date: String) = dao.journalOn(date)
    fun journalRecent() = dao.journalRecent()

    suspend fun saveJournal(j: Journal) {
        if (j.text.isBlank() && j.gratitude.all { it.isBlank() }) dao.deleteJournal(j.date) else dao.upsertJournal(j)
        onChange()
    }

    // ---------- Health ----------

    fun healthOn(date: String) = dao.healthOn(date)
    fun healthSince(from: String) = dao.healthSince(from)

    suspend fun updateHealth(date: String, f: (Health) -> Health) {
        val before = dao.health(date) ?: Health(date)
        val after = f(before)
        dao.upsertHealth(after)
        if (after.water != before.water) syncWaterHabits(date, after.water)
        onChange()
    }

    suspend fun addSession(type: String, minutes: Int, label: String) {
        dao.insertSession(FocusSession(date = Dates.today(), type = type, minutes = minutes, label = label))
        onChange()
    }

    fun sessionsFlow() = dao.sessionsFlow()

    // ---------- Challenges ----------

    fun challengesFlow() = dao.challengesFlow()

    /** Ends challenges whose time ran out. */
    suspend fun refreshChallenges(today: String) {
        for (c in dao.challenges()) {
            val def = Catalog.CHALLENGES.firstOrNull { it.key == c.key } ?: continue
            if (c.status == "active" && Dates.between(c.startDate, today) >= def.days) {
                dao.updateChallenge(c.copy(status = if (c.doneDates.size >= def.days) "completed" else "ended"))
            }
        }
    }

    suspend fun joinChallenge(key: String, today: String): Boolean {
        if (dao.challenges().any { it.key == key && it.status == "active" }) return false
        dao.insertChallenge(UserChallenge(key = key, startDate = today))
        return true
    }

    suspend fun markChallenge(c: UserChallenge, date: String, done: Boolean) {
        val def = Catalog.CHALLENGES.first { it.key == c.key }
        val dates = (if (done) c.doneDates + date else c.doneDates - date).toSortedSet().toList()
        dao.updateChallenge(c.copy(doneDates = dates, status = if (dates.size >= def.days) "completed" else "active"))
        onChange()
    }

    suspend fun leaveChallenge(c: UserChallenge) = dao.updateChallenge(c.copy(status = "left"))

    // ---------- Progress ----------

    data class Stats(
        val from: String, val to: String,
        val days: List<Pair<String, Int?>>,
        val avgCompletion: Int?, val habitsDone: Int, val avgMood: Double?,
        val moodSeries: List<Pair<String, Int>>, val insights: List<String>,
        val points: Int, val level: Points.Level, val badges: List<Points.Badge>,
        val breakdown: List<Triple<String, Int, Int>>,
    )

    suspend fun stats(today: String, month: Boolean): Stats {
        val from: String
        val to: String
        if (!month) {
            from = Dates.add(today, -6); to = today
        } else {
            val d = Dates.parse(today)
            from = d.withDayOfMonth(1).toString(); to = d.withDayOfMonth(d.lengthOfMonth()).toString()
        }
        val habits = dao.habits()
        val allLogs = dao.allLogs()
        val counts = countsByHabit(allLogs)
        val allMoods = dao.moods()
        val moodBy = bestByDate(allMoods.filter { it.date >= Dates.add(today, -89) && it.date <= today }).mapValues { it.value.level }

        val days = mutableListOf<Pair<String, Int?>>()
        var habitsDone = 0
        val parts = HashMap<String, IntArray>()
        var k = from
        while (k <= to) {
            if (k > today) { days += k to null; k = Dates.add(k, 1); continue }
            var s = 0; var d = 0
            for (h in habits) {
                if (!HabitLogic.isScheduled(h, k)) continue
                val done = HabitLogic.doneOn(h, counts[h.id] ?: emptyMap(), k)
                if (h.repeat == "weekly" && !done) continue
                s++; if (done) d++
                val p = parts.getOrPut(Dates.partOfDay(h.startTime)) { IntArray(2) }
                p[0]++; if (done) p[1]++
            }
            habitsDone += d
            days += k to (if (s > 0) Math.round(d * 100f / s) else null)
            k = Dates.add(k, 1)
        }
        val pcts = days.mapNotNull { it.second }
        val rangeMoods = bestByDate(allMoods.filter { it.date in from..to }).values.sortedBy { it.date }

        val insights = mutableListOf<Pair<String, Double>>()
        for (h in habits) {
            val c = counts[h.id] ?: emptyMap()
            val yes = mutableListOf<Int>(); val no = mutableListOf<Int>()
            for ((date, level) in moodBy) {
                if (!HabitLogic.isScheduled(h, date)) continue
                (if (HabitLogic.doneOn(h, c, date)) yes else no) += level
            }
            if (yes.size >= 3 && no.size >= 3) {
                val a = yes.average(); val b = no.average()
                if (a - b >= 0.5) insights += "On days you complete “${h.name}”, your mood is usually ${Catalog.MOOD_NAMES[Math.round(a).toInt() - 1].lowercase()} instead of ${Catalog.MOOD_NAMES[Math.round(b).toInt() - 1].lowercase()}." to (a - b)
            }
        }
        val good = mutableListOf<Int>(); val short = mutableListOf<Int>()
        for (h in dao.healthAll()) {
            val min = Dates.duration(h.sleepStart, h.sleepEnd) ?: continue
            val m = moodBy[h.date] ?: continue
            (if (min >= 420) good else short) += m
        }
        if (good.size >= 3 && short.size >= 3 && good.average() - short.average() >= 0.4) {
            insights += "After 7 hours of sleep or more, your mood tends to be better." to (good.average() - short.average())
        }
        val bigParts = parts.filter { it.value[0] >= 5 }.toList().sortedByDescending { it.second[1].toDouble() / it.second[0] }
        if (bigParts.size >= 2) {
            val (best, v) = bigParts[0]
            insights += "You finish most of your $best habits — ${Math.round(v[1] * 100f / v[0])}% of them." to 0.1
        }

        val sessions = dao.sessions()
        val challenges = dao.challenges()
        val tally = Points.tally(habits, allLogs, allMoods, dao.journals().size, sessions, challenges)
        val bestDayStreak = habits.map { HabitLogic.streaks(it, counts[it.id] ?: emptyMap(), today) }.filter { it.unit == "day" }.maxOfOrNull { it.best } ?: 0
        return Stats(
            from, to, days,
            if (pcts.isEmpty()) null else Math.round(pcts.average()).toInt(),
            habitsDone,
            if (rangeMoods.isEmpty()) null else Math.round(rangeMoods.map { it.level }.average() * 10) / 10.0,
            rangeMoods.map { it.date to it.level },
            insights.sortedByDescending { it.second }.take(3).map { it.first },
            tally.points, Points.levelInfo(tally.points), Points.badges(tally, bestDayStreak),
            listOf(
                Triple("Habits completed", tally.habitsDone, Points.HABIT),
                Triple("Mood check-ins", tally.moods, Points.MOOD),
                Triple("Journal entries", tally.journals, Points.JOURNAL),
                Triple("Breathing and focus sessions", tally.sessions, Points.SESSION),
                Triple("Challenges finished", tally.challenges, Points.CHALLENGE),
            ),
        )
    }

    suspend fun points(): Int {
        val t = Points.tally(dao.habits(), dao.allLogs(), dao.moods(), dao.journals().size, dao.sessions(), dao.challenges())
        return t.points
    }
}
