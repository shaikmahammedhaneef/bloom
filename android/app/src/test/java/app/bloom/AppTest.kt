package app.bloom

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Intent
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performImeAction
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipeLeft
import androidx.compose.ui.test.swipeRight
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import app.bloom.data.Dates
import app.bloom.data.Habit
import app.bloom.data.HabitLog
import app.bloom.data.Health
import app.bloom.data.Journal
import app.bloom.data.Mood
import app.bloom.data.Todo
import app.bloom.reminders.ActionReceiver
import app.bloom.reminders.Reminders
import com.github.takahirom.roborazzi.captureRoboImage
import com.github.takahirom.roborazzi.captureScreenRoboImage
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.time.LocalDateTime
import java.time.LocalTime

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w400dp-h860dp-xhdpi")
class AppTest {
    @get:Rule val compose = createEmptyComposeRule()
    private val app get() = ApplicationProvider.getApplicationContext<BloomApp>()
    private val shots = "build/screens"

    @Before fun seed() = runBlocking {
        shadowOf(app).grantPermissions(Manifest.permission.POST_NOTIFICATIONS)
        app.settings.update { it.copy(onboarded = true, name = "Sam") }
        val dao = app.repo.dao
        // The database instance outlives a single test, so start empty.
        dao.clearHabits(); dao.clearLogs(); dao.clearTodos(); dao.clearMoods(); dao.clearJournal(); dao.clearHealth(); dao.clearSessions(); dao.clearChallenges()
        val today = Dates.today()
        val water = dao.insertHabit(Habit(name = "Drink water", icon = "drop", color = "sky", startTime = "09:00", endTime = "21:00", goal = 8, unit = "glasses", reminder = true, startDate = Dates.add(today, -30)))
        val stretch = dao.insertHabit(Habit(name = "Stretch", icon = "leaf", color = "sage", startTime = "06:35", endTime = "06:45", reminder = true, startDate = Dates.add(today, -30)))
        dao.insertHabit(Habit(name = "Read 20 pages", icon = "book", color = "peach", category = "mind", startTime = "21:30", endTime = "22:00", reminder = true, startDate = Dates.add(today, -30)))
        dao.insertHabit(Habit(name = "Strength workout", icon = "dumbbell", color = "peach", repeat = "weekly", timesPerWeek = 3, startDate = Dates.add(today, -30)))
        for (i in 1..12) {
            val d = Dates.add(today, -i)
            dao.upsertLog(HabitLog(stretch, d, 1))
            dao.upsertLog(HabitLog(water, d, 4 + i % 5))
            dao.insertMood(Mood(date = d, time = "21:00", level = 2 + i % 4, emotions = listOf("Calm")))
            dao.upsertHealth(Health(d, water = 4 + i % 5, steps = 5000 + i * 400, sleepStart = "23:00", sleepEnd = if (i % 2 == 0) "07:00" else "06:15"))
        }
        dao.upsertLog(HabitLog(water, today, 3))
        dao.insertTodo(Todo(title = "Call the dentist", date = today, startTime = "11:00", endTime = "11:15", reminder = true))
        dao.insertTodo(Todo(title = "Team stand-up", date = Dates.add(today, -3), startTime = "10:00", endTime = "10:15", repeat = "days", days = listOf(0, 1, 2, 3, 4, 5, 6)))
        dao.upsertJournal(Journal(Dates.add(today, -1), "What surprised you today?", "A calm walk after lunch.", listOf("Sunshine", "Good coffee", "")))
    }

    private fun tab(label: String) = compose.onNode(hasText(label) and hasClickAction()).performClick()

    @Test fun screens() {
        ActivityScenario.launch(MainActivity::class.java).use {
            compose.waitForIdle()
            compose.onRoot().captureRoboImage("$shots/1-today.png")
            tab("Habits"); compose.waitForIdle(); compose.onRoot().captureRoboImage("$shots/2-habits.png")
            compose.onNode(hasText("Stretch") and hasClickAction()).performClick(); compose.waitForIdle()
            compose.onRoot().captureRoboImage("$shots/3-habit-detail.png")
            it.onActivity { a -> a.onBackPressedDispatcher.onBackPressed() }
            compose.waitForIdle()
            tab("Mood"); compose.waitForIdle(); compose.onRoot().captureRoboImage("$shots/4-mood.png")
            tab("Health"); compose.waitForIdle(); compose.onRoot().captureRoboImage("$shots/5-health.png")
            tab("Progress"); Thread.sleep(500); compose.waitForIdle(); compose.onRoot().captureRoboImage("$shots/6-progress.png")
        }
    }

    private fun waitFor(what: String, check: () -> Boolean) {
        repeat(60) { if (check()) return; Thread.sleep(50); compose.waitForIdle() }
        throw AssertionError("Timed out waiting for $what")
    }

    @Test fun quickAddAndSwipe() {
        val dao = app.repo.dao
        ActivityScenario.launch(MainActivity::class.java).use {
            compose.waitForIdle()
            // Quick add: one line, the time and day are understood.
            compose.onNodeWithText("Add", useUnmergedTree = true).performClick()
            compose.waitForIdle()
            compose.onNode(hasSetTextAction()).performTextInput("call mom at 6pm tomorrow")
            compose.waitForIdle()
            captureScreenRoboImage("$shots/7-quick-add.png")
            compose.onNode(hasSetTextAction()).performImeAction()
            waitFor("the new to-do") { runBlocking { dao.todos().any { it.title == "Call mom" } } }
            val t = runBlocking { dao.todos().first { it.title == "Call mom" } }
            assertEquals(Dates.add(Dates.today(), 1), t.date)
            assertEquals("18:00", t.startTime)
            assertTrue(t.reminder)

            // Swipe left deletes, and Undo brings it back. (Wait for the "Added" message to go first.)
            compose.mainClock.advanceTimeBy(6000)
            compose.waitForIdle()
            compose.onNodeWithText("Call the dentist").performTouchInput { swipeLeft() }
            waitFor("the delete") { runBlocking { dao.todos().none { it.title == "Call the dentist" } } }
            compose.waitForIdle()
            compose.onRoot().captureRoboImage("$shots/8-undo.png")
            compose.onNodeWithText("Undo").performClick()
            waitFor("the undo") { runBlocking { dao.todos().any { it.title == "Call the dentist" } } }

            // Swipe right ticks a habit off.
            compose.waitForIdle()
            compose.onNodeWithText("Stretch").performTouchInput { swipeRight() }
            val stretch = runBlocking { dao.habits().first { it.name == "Stretch" } }
            waitFor("the habit to be done") { runBlocking { dao.log(stretch.id, Dates.today())?.count == 1 } }
        }
    }

    @Test @Config(qualifiers = "w360dp-h740dp-xhdpi") fun smallPhoneLargeText() {
        RuntimeEnvironment.setFontScale(1.3f)
        ActivityScenario.launch(MainActivity::class.java).use {
            compose.waitForIdle()
            compose.onRoot().captureRoboImage("$shots/9-small-large-text.png")
            compose.onNode(hasText("Habits") and hasClickAction()).performClick()
            compose.waitForIdle()
            compose.onNode(hasText("Stretch") and hasClickAction()).performClick()
            compose.waitForIdle()
            compose.onRoot().captureRoboImage("$shots/10-small-habit.png")
        }
    }

    @Test fun reminders() = runBlocking {
        val today = Dates.today()
        // At 08:00 today, everything later today and tomorrow is due.
        val due = Reminders.upcoming(app, LocalDateTime.of(java.time.LocalDate.now(), LocalTime.of(8, 0)))
        val kinds = due.filter { it.date == today }.map { it.kind to it.at.toLocalTime().toString() }
        assertTrue("water habit at 09:00", "habit" to "09:00" in kinds)
        assertTrue("dentist to-do at 11:00", "todo" to "11:00" in kinds)
        assertTrue("mood at 21:00", "mood" to "21:00" in kinds)
        assertTrue("streak at 20:00", "streak" to "20:00" in kinds)
        // Stretch (06:35) is already past at 08:00.
        assertTrue(due.none { it.date == today && it.at.toLocalTime() < LocalTime.of(8, 0) })

        Reminders.reschedule(app)
        val alarms = shadowOf(app.getSystemService(AlarmManager::class.java)).scheduledAlarms
        assertTrue("alarms are set", alarms.isNotEmpty())

        // The water reminder fires: it shows +1 / Done / Snooze.
        val water = app.repo.dao.habits().first { it.name == "Drink water" }
        val key = "h:${water.id}:$today"
        Reminders.fire(app, key, "habit", water.id, today)
        val nm = shadowOf(app.getSystemService(NotificationManager::class.java))
        val n = nm.allNotifications.single()
        assertEquals("Drink water", n.extras.getString("android.title"))
        assertEquals(listOf("+1", "Done", "Snooze 10 min"), n.actions.map { it.title.toString() })

        // Tapping Done in the notification completes the habit without opening the app.
        app.sendBroadcast(
            Intent(app, ActionReceiver::class.java).setAction("app.bloom.DONE")
                .putExtra("key", key).putExtra("kind", "habit").putExtra("refId", water.id).putExtra("date", today),
        )
        shadowOf(android.os.Looper.getMainLooper()).idle()
        var count = 0
        repeat(50) { count = app.repo.dao.log(water.id, today)?.count ?: 0; if (count >= 8) return@repeat; Thread.sleep(50) }
        assertEquals(8, count)
        // Health water stays in step with the water habit.
        assertEquals(8, app.repo.dao.health(today)?.water)

        // Once it's done, the reminder doesn't show again.
        nm.allNotifications.forEach { _ -> }
        app.getSystemService(NotificationManager::class.java).cancelAll()
        Reminders.fire(app, key, "habit", water.id, today)
        assertTrue(nm.allNotifications.isEmpty())

        // Mood reminder offers one-tap moods.
        Reminders.fire(app, "m:$today", "mood", 0, today)
        assertEquals(3, nm.allNotifications.single().actions.size)
    }
}
