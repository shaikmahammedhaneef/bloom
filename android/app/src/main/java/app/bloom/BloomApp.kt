package app.bloom

import android.app.Application
import app.bloom.data.BloomDb
import app.bloom.data.Repository
import app.bloom.data.SettingsStore
import app.bloom.reminders.Reminders
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class BloomApp : Application() {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    lateinit var settings: SettingsStore
        private set
    lateinit var repo: Repository
        private set
    private var pending: Job? = null

    override fun onCreate() {
        super.onCreate()
        settings = SettingsStore(this)
        repo = Repository(BloomDb.get(this).dao(), settings) { requestReschedule() }
        Reminders.createChannels(this)
        requestReschedule()
    }

    /** Reschedules reminders shortly after data changes (several quick changes → one reschedule). */
    fun requestReschedule() {
        pending?.cancel()
        pending = scope.launch {
            delay(400)
            Reminders.reschedule(this@BloomApp)
        }
    }
}
