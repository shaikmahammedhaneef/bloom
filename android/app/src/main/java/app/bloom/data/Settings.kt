package app.bloom.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray

// What used to be the user's profile on the server. There's no account: it all
// stays in this phone's app storage.
data class Settings(
    val onboarded: Boolean = false,
    val name: String = "",
    val goals: List<String> = emptyList(),
    val recharge: String = "",
    val roleModel: String = "",
    val accent: String = "sage",
    /** "system", "light" or "dark". */
    val theme: String = "system",
    val waterGoal: Int = 8,
    val stepGoal: Int = 8000,
    val remindRoutine: Boolean = true,
    val remindMood: Boolean = true,
    val moodTime: String = "21:00",
    val remindStreak: Boolean = true,
    val streakTime: String = "20:00",
    val snoozeMinutes: Int = 10,
)

class SettingsStore(context: Context) {
    private val prefs = context.getSharedPreferences("bloom_settings", Context.MODE_PRIVATE)
    private val state = MutableStateFlow(load())
    val flow: StateFlow<Settings> = state
    val value: Settings get() = state.value

    private fun load(): Settings {
        val d = Settings()
        return Settings(
            onboarded = prefs.getBoolean("onboarded", d.onboarded),
            name = prefs.getString("name", d.name)!!,
            goals = prefs.getString("goals", "[]")!!.let { s -> JSONArray(s).let { a -> List(a.length()) { a.getString(it) } } },
            recharge = prefs.getString("recharge", d.recharge)!!,
            roleModel = prefs.getString("roleModel", d.roleModel)!!,
            accent = prefs.getString("accent", d.accent)!!,
            theme = prefs.getString("theme", d.theme)!!,
            waterGoal = prefs.getInt("waterGoal", d.waterGoal),
            stepGoal = prefs.getInt("stepGoal", d.stepGoal),
            remindRoutine = prefs.getBoolean("remindRoutine", d.remindRoutine),
            remindMood = prefs.getBoolean("remindMood", d.remindMood),
            moodTime = prefs.getString("moodTime", d.moodTime)!!,
            remindStreak = prefs.getBoolean("remindStreak", d.remindStreak),
            streakTime = prefs.getString("streakTime", d.streakTime)!!,
            snoozeMinutes = prefs.getInt("snoozeMinutes", d.snoozeMinutes),
        )
    }

    fun update(f: (Settings) -> Settings) {
        val s = f(state.value)
        prefs.edit()
            .putBoolean("onboarded", s.onboarded)
            .putString("name", s.name)
            .putString("goals", JSONArray(s.goals).toString())
            .putString("recharge", s.recharge)
            .putString("roleModel", s.roleModel)
            .putString("accent", s.accent)
            .putString("theme", s.theme)
            .putInt("waterGoal", s.waterGoal)
            .putInt("stepGoal", s.stepGoal)
            .putBoolean("remindRoutine", s.remindRoutine)
            .putBoolean("remindMood", s.remindMood)
            .putString("moodTime", s.moodTime)
            .putBoolean("remindStreak", s.remindStreak)
            .putString("streakTime", s.streakTime)
            .putInt("snoozeMinutes", s.snoozeMinutes)
            .apply()
        state.value = s
    }
}
