package app.bloom.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.TypeConverter
import org.json.JSONArray

// Everything lives on the phone. Days are "yyyy-MM-dd" keys and times "HH:mm",
// the same format the web app used, so CSV exports line up.

@Entity(tableName = "habits")
data class Habit(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val icon: String = "check",
    val color: String = "sage",
    val category: String = "health",
    val startTime: String = "",
    val endTime: String = "",
    /** "daily", "weekly" (X times a week) or "days" (some weekdays). */
    val repeat: String = "daily",
    val timesPerWeek: Int = 3,
    /** 0 = Sunday … 6 = Saturday, for repeat "days". */
    val days: List<Int> = emptyList(),
    val goal: Int = 1,
    val unit: String = "",
    val reminder: Boolean = false,
    val startDate: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    /** Days taken off the schedule with "delete only this day". */
    @ColumnInfo(defaultValue = "[]") val skipDates: List<String> = emptyList(),
    /** Last day of the habit after "delete this and all next days". Earlier days keep their history. */
    @ColumnInfo(defaultValue = "") val endDate: String = "",
    /** Ring as an alarm (sound, vibration, full screen) instead of a quiet notification. */
    @ColumnInfo(defaultValue = "0") val alarm: Boolean = false,
    /** Ringtone URI for the alarm. Empty means the default alarm sound from Settings. */
    @ColumnInfo(defaultValue = "") val alarmTone: String = "",
)

@Entity(tableName = "habit_logs", primaryKeys = ["habitId", "date"], indices = [Index("date")])
data class HabitLog(val habitId: Long, val date: String, val count: Int)

@Entity(tableName = "todos", indices = [Index("date")])
data class Todo(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    /** The day, or the first day of a repeating or multi-day to-do. */
    val date: String,
    /** Last day of a multi-day to-do, or when a repeat stops. */
    val endDate: String = "",
    val startTime: String = "",
    val endTime: String = "",
    /** One-off to-dos only. */
    val done: Boolean = false,
    val reminder: Boolean = false,
    /** "none", "daily" or "days". */
    val repeat: String = "none",
    val days: List<Int> = emptyList(),
    val doneDates: List<String> = emptyList(),
    val skipDates: List<String> = emptyList(),
    val createdAt: Long = System.currentTimeMillis(),
    @ColumnInfo(defaultValue = "0") val alarm: Boolean = false,
    @ColumnInfo(defaultValue = "") val alarmTone: String = "",
)

@Entity(tableName = "moods", indices = [Index("date")])
data class Mood(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val date: String,
    val time: String,
    val level: Int,
    val emotions: List<String> = emptyList(),
    val triggers: List<String> = emptyList(),
    val note: String = "",
)

@Entity(tableName = "journal")
data class Journal(
    @PrimaryKey val date: String,
    val prompt: String = "",
    val text: String = "",
    val gratitude: List<String> = emptyList(),
)

@Entity(tableName = "health")
data class Health(
    @PrimaryKey val date: String,
    val water: Int = 0,
    val steps: Int = 0,
    val weight: Double? = null,
    /** Sleep is stored on the day you woke up. */
    val sleepStart: String = "",
    val sleepEnd: String = "",
)

@Entity(tableName = "sessions", indices = [Index("date")])
data class FocusSession(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val date: String,
    /** "breathe", "focus" or "workout". */
    val type: String,
    val minutes: Int,
    val label: String = "",
)

@Entity(tableName = "challenges")
data class UserChallenge(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val key: String,
    val startDate: String,
    val doneDates: List<String> = emptyList(),
    /** "active", "completed", "ended" or "left". */
    val status: String = "active",
)

class Converters {
    @TypeConverter
    fun intsToString(v: List<Int>): String = JSONArray(v).toString()

    @TypeConverter
    fun stringToInts(s: String): List<Int> = JSONArray(s).let { a -> List(a.length()) { a.getInt(it) } }

    @TypeConverter
    fun stringsToString(v: List<String>): String = JSONArray(v).toString()

    @TypeConverter
    fun stringToStrings(s: String): List<String> = JSONArray(s).let { a -> List(a.length()) { a.getString(it) } }
}
