package app.bloom.data

// Points, levels and badges, as in the web app's lib/points.ts.
object Points {
    const val HABIT = 10
    const val MOOD = 5
    const val JOURNAL = 15
    const val SESSION = 5
    const val CHALLENGE = 200

    data class Level(val level: Int, val name: String, val start: Int, val next: Int, val nextName: String)

    fun levelInfo(points: Int): Level {
        var level = 1
        while (75 * (level + 1) * level <= points) level++
        fun name(l: Int) = Catalog.LEVEL_NAMES[minOf(l - 1, Catalog.LEVEL_NAMES.size - 1)]
        return Level(level, name(level), 75 * level * (level - 1), 75 * (level + 1) * level, name(level + 1))
    }

    data class Tally(
        val points: Int, val habitsDone: Int, val moods: Int, val journals: Int, val sessions: Int,
        val breathe: Int, val focus: Int, val challenges: Int, val early: Int, val goalHits: Int, val categories: Int,
    )

    data class Badge(val key: String, val name: String, val desc: String, val icon: String, val earned: Boolean)

    fun tally(habits: List<Habit>, logs: List<HabitLog>, moods: List<Mood>, journals: Int, sessions: List<FocusSession>, challenges: List<UserChallenge>): Tally {
        val byId = habits.associateBy { it.id }
        var habitsDone = 0
        var early = 0
        var goalHits = 0
        val cats = HashSet<String>()
        for (l in logs) {
            val h = byId[l.habitId] ?: continue
            if (l.count < maxOf(1, h.goal)) continue
            habitsDone++
            cats += h.category
            if (h.startTime.isNotEmpty() && h.startTime < "08:00") early++
            if (h.goal > 1) goalHits++
        }
        val moodDays = moods.map { it.date }.toSet().size
        val done = challenges.count { it.status == "completed" }
        val points = habitsDone * HABIT + moodDays * MOOD + journals * JOURNAL + sessions.size * SESSION + done * CHALLENGE
        return Tally(points, habitsDone, moodDays, journals, sessions.size, sessions.count { it.type == "breathe" }, sessions.count { it.type == "focus" }, done, early, goalHits, cats.size)
    }

    fun badges(p: Tally, bestDayStreak: Int): List<Badge> = listOf(
        Badge("streak-7", "7-day streak", "Keep any habit going for 7 days", "flame", bestDayStreak >= 7),
        Badge("streak-30", "30-day streak", "Keep any habit going for 30 days", "flame", bestDayStreak >= 30),
        Badge("early-bird", "Early bird", "Finish 10 habits that start before 8:00", "sun", p.early >= 10),
        Badge("goal-getter", "Goal getter", "Hit a count goal, like 8 glasses, 7 times", "drop", p.goalHits >= 7),
        Badge("first-journal", "First journal", "Write your first journal entry", "pen", p.journals >= 1),
        Badge("mood-mapper", "Mood mapper", "Check in your mood on 7 days", "smile", p.moods >= 7),
        Badge("century", "100 habits", "Complete 100 habits", "star", p.habitsDone >= 100),
        Badge("zen", "Zen master", "Finish 10 breathing sessions", "wind", p.breathe >= 10),
        Badge("deep-focus", "Deep focus", "Finish 10 focus sessions", "target", p.focus >= 10),
        Badge("all-rounder", "All-rounder", "Complete habits in 3 categories", "grid", p.categories >= 3),
        Badge("challenge-champ", "Challenge champ", "Finish a challenge", "trophy", p.challenges >= 1),
        Badge("level-5", "Blooming", "Reach level 5", "sparkle", levelInfo(p.points).level >= 5),
    )
}
