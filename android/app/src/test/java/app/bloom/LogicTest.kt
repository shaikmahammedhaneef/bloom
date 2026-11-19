package app.bloom

import app.bloom.data.Dates
import app.bloom.data.Habit
import app.bloom.data.HabitLogic
import app.bloom.data.Todo
import app.bloom.data.TodoLogic
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LogicTest {
    private val today = "2026-11-19" // a Thursday

    @Test fun dates() {
        assertEquals(4, Dates.dow(today))
        assertEquals("2026-11-16", Dates.weekStart(today))
        assertEquals(480, Dates.duration("23:00", "07:00"))
        assertEquals("7:05 AM", Dates.fmtTime("07:05"))
        assertEquals("12:00 PM", Dates.fmtTime("12:00"))
    }

    @Test fun dailyStreakSkipsUnfinishedToday() {
        val h = Habit(name = "Read", startDate = "2026-11-01")
        val counts = (1..5).associate { Dates.add(today, -it) to 1 }
        val s = HabitLogic.streaks(h, counts, today)
        assertEquals(5, s.current)
        assertEquals(5, s.best)
        assertEquals("day", s.unit)
        // Doing it today extends the streak.
        assertEquals(6, HabitLogic.streaks(h, counts + (today to 1), today).current)
    }

    @Test fun someDaysOnlyCountsScheduledDays() {
        // Mon, Wed, Fri. Today is Thursday, so it isn't scheduled.
        val h = Habit(name = "Gym", repeat = "days", days = listOf(1, 3, 5), startDate = "2026-11-01")
        assertFalse(HabitLogic.isScheduled(h, today))
        val counts = mapOf("2026-11-18" to 1, "2026-11-16" to 1, "2026-11-13" to 1)
        assertEquals(3, HabitLogic.streaks(h, counts, today).current)
    }

    @Test fun goalCounts() {
        val h = Habit(name = "Water", goal = 8, unit = "glasses")
        assertFalse(HabitLogic.doneOn(h, mapOf(today to 7), today))
        assertTrue(HabitLogic.doneOn(h, mapOf(today to 8), today))
        assertTrue(HabitLogic.isWaterHabit(h))
    }

    @Test fun weeklyStreak() {
        val h = Habit(name = "Run", repeat = "weekly", timesPerWeek = 2, startDate = "2026-10-01")
        // Two runs in each of the last two full weeks, none yet this week.
        val counts = listOf("2026-11-10", "2026-11-12", "2026-11-03", "2026-11-05").associateWith { 1 }
        val s = HabitLogic.streaks(h, counts, today)
        assertEquals("week", s.unit)
        assertEquals(2, s.current)
    }

    @Test fun repeatingTodos() {
        val t = Todo(title = "Stand-up", date = "2026-11-02", repeat = "days", days = listOf(1, 2, 3, 4, 5), skipDates = listOf("2026-11-18"))
        assertTrue(TodoLogic.occursOn(t, today))
        assertFalse(TodoLogic.occursOn(t, "2026-11-18")) // skipped
        assertFalse(TodoLogic.occursOn(t, "2026-11-22")) // Sunday
        val multi = Todo(title = "Trip", date = "2026-11-18", endDate = "2026-11-20")
        assertTrue(TodoLogic.occursOn(multi, today))
        assertFalse(TodoLogic.occursOn(multi, "2026-11-21"))
    }

    @Test fun labels() {
        assertEquals("Weekdays", HabitLogic.daysLabel(listOf(1, 2, 3, 4, 5)))
        assertEquals("Mon, Wed, Fri", HabitLogic.daysLabel(listOf(5, 1, 3)))
    }
}
