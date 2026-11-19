package app.bloom.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.room.Update
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface BloomDao {
    // Habits
    @Query("SELECT * FROM habits ORDER BY createdAt") fun habitsFlow(): Flow<List<Habit>>
    @Query("SELECT * FROM habits ORDER BY createdAt") suspend fun habits(): List<Habit>
    @Query("SELECT * FROM habits WHERE id = :id") fun habitFlow(id: Long): Flow<Habit?>
    @Query("SELECT * FROM habits WHERE id = :id") suspend fun habit(id: Long): Habit?
    @Insert suspend fun insertHabit(h: Habit): Long
    @Insert suspend fun insertHabits(h: List<Habit>)
    @Update suspend fun updateHabit(h: Habit)
    @Query("DELETE FROM habits WHERE id = :id") suspend fun deleteHabit(id: Long)

    // Habit logs
    @Query("SELECT * FROM habit_logs WHERE date >= :from") fun logsFlow(from: String): Flow<List<HabitLog>>
    @Query("SELECT * FROM habit_logs WHERE date >= :from") suspend fun logsSince(from: String): List<HabitLog>
    @Query("SELECT * FROM habit_logs ORDER BY date") suspend fun allLogs(): List<HabitLog>
    @Query("SELECT * FROM habit_logs WHERE habitId = :id AND date = :date") suspend fun log(id: Long, date: String): HabitLog?
    @Upsert suspend fun upsertLog(l: HabitLog)
    @Query("DELETE FROM habit_logs WHERE habitId = :id") suspend fun deleteLogs(id: Long)

    // To-dos
    @Query("SELECT * FROM todos ORDER BY createdAt") fun todosFlow(): Flow<List<Todo>>
    @Query("SELECT * FROM todos ORDER BY createdAt") suspend fun todos(): List<Todo>
    @Query("SELECT * FROM todos WHERE id = :id") suspend fun todo(id: Long): Todo?
    @Insert suspend fun insertTodo(t: Todo): Long
    @Update suspend fun updateTodo(t: Todo)
    @Query("DELETE FROM todos WHERE id = :id") suspend fun deleteTodo(id: Long)

    // Moods
    @Query("SELECT * FROM moods WHERE date = :date ORDER BY time") fun moodsOn(date: String): Flow<List<Mood>>
    @Query("SELECT * FROM moods WHERE date >= :from ORDER BY date, time") fun moodsSince(from: String): Flow<List<Mood>>
    @Query("SELECT * FROM moods ORDER BY date, time") suspend fun moods(): List<Mood>
    @Query("SELECT COUNT(*) FROM moods WHERE date = :date") suspend fun moodCount(date: String): Int
    @Insert suspend fun insertMood(m: Mood): Long
    @Update suspend fun updateMood(m: Mood)
    @Delete suspend fun deleteMood(m: Mood)

    // Journal
    @Query("SELECT * FROM journal WHERE date = :date") fun journalOn(date: String): Flow<Journal?>
    @Query("SELECT * FROM journal ORDER BY date DESC LIMIT 60") fun journalRecent(): Flow<List<Journal>>
    @Query("SELECT * FROM journal ORDER BY date") suspend fun journals(): List<Journal>
    @Upsert suspend fun upsertJournal(j: Journal)
    @Query("DELETE FROM journal WHERE date = :date") suspend fun deleteJournal(date: String)

    // Health
    @Query("SELECT * FROM health WHERE date = :date") fun healthOn(date: String): Flow<Health?>
    @Query("SELECT * FROM health WHERE date = :date") suspend fun health(date: String): Health?
    @Query("SELECT * FROM health WHERE date >= :from ORDER BY date") fun healthSince(from: String): Flow<List<Health>>
    @Query("SELECT * FROM health ORDER BY date") suspend fun healthAll(): List<Health>
    @Upsert suspend fun upsertHealth(h: Health)

    // Sessions
    @Insert suspend fun insertSession(s: FocusSession)
    @Query("SELECT * FROM sessions ORDER BY date") suspend fun sessions(): List<FocusSession>
    @Query("SELECT * FROM sessions ORDER BY date") fun sessionsFlow(): Flow<List<FocusSession>>

    // Challenges
    @Query("SELECT * FROM challenges WHERE status != 'left' ORDER BY id DESC") fun challengesFlow(): Flow<List<UserChallenge>>
    @Query("SELECT * FROM challenges") suspend fun challenges(): List<UserChallenge>
    @Insert suspend fun insertChallenge(c: UserChallenge): Long
    @Update suspend fun updateChallenge(c: UserChallenge)

    // Backup restore
    @Query("DELETE FROM habits") suspend fun clearHabits()
    @Query("DELETE FROM habit_logs") suspend fun clearLogs()
    @Query("DELETE FROM todos") suspend fun clearTodos()
    @Query("DELETE FROM moods") suspend fun clearMoods()
    @Query("DELETE FROM journal") suspend fun clearJournal()
    @Query("DELETE FROM health") suspend fun clearHealth()
    @Query("DELETE FROM sessions") suspend fun clearSessions()
    @Query("DELETE FROM challenges") suspend fun clearChallenges()
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putHabits(v: List<Habit>)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putLogs(v: List<HabitLog>)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putTodos(v: List<Todo>)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putMoods(v: List<Mood>)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putJournals(v: List<Journal>)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putHealth(v: List<Health>)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putSessions(v: List<FocusSession>)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putChallenges(v: List<UserChallenge>)
}

@Database(
    entities = [Habit::class, HabitLog::class, Todo::class, Mood::class, Journal::class, Health::class, FocusSession::class, UserChallenge::class],
    version = 1,
    exportSchema = true,
)
@TypeConverters(Converters::class)
abstract class BloomDb : RoomDatabase() {
    abstract fun dao(): BloomDao

    companion object {
        @Volatile private var instance: BloomDb? = null

        fun get(context: Context): BloomDb = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(context.applicationContext, BloomDb::class.java, "bloom.db").build().also { instance = it }
        }
    }
}
