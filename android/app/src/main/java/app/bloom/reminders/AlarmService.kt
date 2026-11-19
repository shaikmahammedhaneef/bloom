package app.bloom.reminders

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.content.ContextCompat
import app.bloom.BloomApp
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Rings an alarm: loops the chosen sound on the alarm volume, vibrates, and keeps a
 * full-screen notification up until you tap Done, Snooze or Stop, or it times out.
 */
class AlarmService : Service() {
    private var player: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private val handler = Handler(Looper.getMainLooper())

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopRinging()
            return START_NOT_STICKY
        }
        val a = Alarm.from(intent) ?: run { stopSelf(); return START_NOT_STICKY }
        val n: Notification = Reminders.alarmNotification(this, a)
        if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        else startForeground(NOTIFICATION_ID, n)
        // A new alarm replaces one that's still ringing.
        release()
        state.value = a
        val s = (application as BloomApp).settings.value
        play(a.tone)
        if (s.alarmVibrate) vibrate()
        handler.removeCallbacksAndMessages(null)
        handler.postDelayed({ timedOut(a) }, s.alarmMinutes.coerceIn(1, 10) * 60_000L)
        return START_NOT_STICKY
    }

    private fun play(tone: String) {
        val candidates = listOfNotNull(
            tone.takeIf { it.isNotBlank() }?.let(Uri::parse),
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
        )
        for (uri in candidates) {
            // A tone can go missing (e.g. a deleted music file), so fall back to the next one.
            val p = MediaPlayer()
            try {
                p.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                p.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK)
                p.setDataSource(this, uri)
                p.isLooping = true
                p.prepare()
                p.start()
                player = p
                return
            } catch (e: Exception) {
                p.release()
            }
        }
    }

    private fun vibrate() {
        val v = if (Build.VERSION.SDK_INT >= 31) getSystemService(VibratorManager::class.java).defaultVibrator
        else @Suppress("DEPRECATION") (getSystemService(Context.VIBRATOR_SERVICE) as Vibrator)
        vibrator = v
        v.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 800, 600), 0))
    }

    /** Nobody answered: stop ringing and leave an ordinary reminder behind. */
    private fun timedOut(a: Alarm) {
        val app = application as BloomApp
        app.scope.launch { Reminders.fire(app, a.key, a.kind, a.refId, a.date, quiet = true, missed = true) }
        stopRinging()
    }

    private fun release() {
        player?.runCatching { stop(); release() }
        player = null
        vibrator?.cancel()
        vibrator = null
    }

    private fun stopRinging() {
        handler.removeCallbacksAndMessages(null)
        release()
        state.value = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        release()
        state.value = null
        super.onDestroy()
    }

    /** What's ringing. */
    data class Alarm(val key: String, val kind: String, val refId: Long, val date: String, val title: String, val body: String, val tone: String) {
        fun toIntent(ctx: Context) = Intent(ctx, AlarmService::class.java)
            .putExtra("key", key).putExtra("kind", kind).putExtra("refId", refId).putExtra("date", date)
            .putExtra("title", title).putExtra("body", body).putExtra("tone", tone)

        companion object {
            fun from(i: Intent?): Alarm? {
                i ?: return null
                return Alarm(
                    i.getStringExtra("key") ?: return null, i.getStringExtra("kind") ?: return null, i.getLongExtra("refId", 0),
                    i.getStringExtra("date") ?: return null, i.getStringExtra("title") ?: "Bloom", i.getStringExtra("body") ?: "", i.getStringExtra("tone") ?: "",
                )
            }
        }
    }

    companion object {
        const val NOTIFICATION_ID = 4242
        const val ACTION_STOP = "app.bloom.ALARM_STOP"
        private val state = MutableStateFlow<Alarm?>(null)
        /** The alarm ringing now, or null. The alarm screen closes when this goes back to null. */
        val ringing: StateFlow<Alarm?> = state

        /** Starts ringing. Returns false if Android didn't allow it (the caller then shows a notification). */
        fun start(ctx: Context, a: Alarm): Boolean = try {
            ContextCompat.startForegroundService(ctx, a.toIntent(ctx))
            true
        } catch (e: Exception) {
            false
        }

        fun stop(ctx: Context) {
            if (state.value == null) return
            ctx.startService(Intent(ctx, AlarmService::class.java).setAction(ACTION_STOP))
        }
    }
}
