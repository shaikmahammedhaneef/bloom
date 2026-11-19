package app.bloom

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import app.bloom.data.BloomDb
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

/** People who installed 1.0 or 1.1 have a version-1 database. Updating must keep their data. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class MigrationTest {
    @Test fun upgradesVersion1WithoutLosingData() = runBlocking {
        val ctx = ApplicationProvider.getApplicationContext<Context>()
        val name = "migrate-test.db"
        ctx.deleteDatabase(name)
        val file = ctx.getDatabasePath(name).apply { parentFile?.mkdirs() }

        // Build the exact version-1 database from the schema Room exported for it.
        val schema = JSONObject(File("schemas/app.bloom.data.BloomDb/1.json").readText()).getJSONObject("database")
        val db = SQLiteDatabase.openOrCreateDatabase(file, null)
        val entities = schema.getJSONArray("entities")
        for (i in 0 until entities.length()) {
            val e = entities.getJSONObject(i)
            val table = e.getString("tableName")
            db.execSQL(e.getString("createSql").replace("\${TABLE_NAME}", table))
            val indices = e.optJSONArray("indices")
            if (indices != null) for (j in 0 until indices.length()) db.execSQL(indices.getJSONObject(j).getString("createSql").replace("\${TABLE_NAME}", table))
        }
        val setup = schema.getJSONArray("setupQueries")
        for (i in 0 until setup.length()) db.execSQL(setup.getString(i))
        db.execSQL(
            "INSERT INTO habits (id, name, icon, color, category, startTime, endTime, repeat, timesPerWeek, days, goal, unit, reminder, startDate, createdAt) " +
                "VALUES (1, 'Old habit', 'book', 'sage', 'mind', '07:00', '', 'daily', 3, '[]', 1, '', 1, '2026-01-01', 1)",
        )
        db.execSQL("INSERT INTO habit_logs (habitId, date, count) VALUES (1, '2026-01-02', 1)")
        db.execSQL(
            "INSERT INTO todos (id, title, date, endDate, startTime, endTime, done, reminder, repeat, days, doneDates, skipDates, createdAt) " +
                "VALUES (1, 'Old to-do', '2026-01-01', '', '09:00', '', 0, 1, 'none', '[]', '[]', '[]', 1)",
        )
        db.version = 1
        db.close()

        val room = Room.databaseBuilder(ctx, BloomDb::class.java, name).addMigrations(BloomDb.MIGRATION_1_2).build()
        val h = room.dao().habits().single()
        assertEquals("Old habit", h.name)
        assertEquals(emptyList<String>(), h.skipDates)
        assertEquals("", h.endDate)
        assertFalse(h.alarm)
        assertEquals(1, room.dao().allLogs().size)
        val t = room.dao().todos().single()
        assertEquals("Old to-do", t.title)
        assertFalse(t.alarm)
        room.close()
    }
}
