package app.bloom.reminders

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Alarm
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.bloom.BloomApp
import app.bloom.data.Dates
import app.bloom.ui.theme.BloomTheme
import app.bloom.ui.theme.LocalBloom

/** The full-screen alarm, shown over the lock screen while an alarm rings. */
class AlarmActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val app = application as BloomApp
        val a = AlarmService.Alarm.from(intent) ?: AlarmService.ringing.value ?: run { finish(); return }
        setContent {
            val s by app.settings.flow.collectAsStateWithLifecycle()
            val ringing by AlarmService.ringing.collectAsStateWithLifecycle()
            // Close when the alarm is answered from the notification, or times out.
            LaunchedEffect(ringing) { if (ringing == null) finish() }
            BloomTheme(s.accent, s.theme) {
                val b = LocalBloom.current
                val pulse by rememberInfiniteTransition(label = "pulse").animateFloat(0.9f, 1.1f, infiniteRepeatable(tween(700), RepeatMode.Reverse), label = "scale")
                Column(
                    Modifier.fillMaxSize().background(b.bg).safeDrawingPadding().padding(28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center,
                ) {
                    Box(Modifier.size(120.dp).scale(pulse).background(b.accSoft, CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Rounded.Alarm, null, tint = b.acc, modifier = Modifier.size(64.dp))
                    }
                    Spacer(Modifier.height(28.dp))
                    Text(Dates.fmtTime(Dates.nowTime()), fontSize = 56.sp, fontWeight = FontWeight.SemiBold, color = b.ink)
                    Spacer(Modifier.height(8.dp))
                    Text(a.title, fontSize = 26.sp, fontWeight = FontWeight.SemiBold, color = b.ink, textAlign = TextAlign.Center)
                    if (a.body.isNotBlank()) Text(a.body, fontSize = 16.sp, color = b.muted, textAlign = TextAlign.Center)
                    Spacer(Modifier.height(40.dp))
                    if (a.kind == "habit" || a.kind == "todo") {
                        Button(onClick = { act("DONE", a) }, Modifier.fillMaxWidth().height(56.dp)) { Text("Done", fontSize = 18.sp) }
                        Spacer(Modifier.height(12.dp))
                    }
                    if (a.kind != "test") OutlinedButton(onClick = { act("SNOOZE", a) }, Modifier.fillMaxWidth().height(56.dp)) { Text("Snooze ${s.snoozeMinutes} min", fontSize = 18.sp) }
                    Spacer(Modifier.height(4.dp))
                    TextButton(onClick = { act("DISMISS", a) }, Modifier.fillMaxWidth()) { Text("Stop") }
                }
            }
        }
    }

    private fun act(what: String, a: AlarmService.Alarm) {
        sendBroadcast(
            Intent(this, ActionReceiver::class.java).setAction("app.bloom.$what")
                .putExtra("key", a.key).putExtra("kind", a.kind).putExtra("refId", a.refId).putExtra("date", a.date),
        )
        finish()
    }
}
