package app.bloom.ui.components

import android.app.Activity
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.IntentCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import app.bloom.reminders.Reminders
import app.bloom.ui.theme.LocalBloom

/** The name Android gives a ringtone URI. Empty means the default sound. */
@Composable
fun toneName(tone: String, defaultName: String = "Default alarm sound"): String {
    val ctx = LocalContext.current
    return remember(tone) {
        if (tone.isBlank()) defaultName
        else runCatching { RingtoneManager.getRingtone(ctx, Uri.parse(tone))?.getTitle(ctx) }.getOrNull() ?: "Custom sound"
    }
}

/**
 * A row that opens Android's sound picker (alarms, ringtones and your own sounds).
 * `tone` is a URI string; "" means "use the default".
 */
@Composable
fun AlarmToneRow(label: String, tone: String, defaultName: String = "Default alarm sound", onChange: (String) -> Unit) {
    val b = LocalBloom.current
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        if (r.resultCode == Activity.RESULT_OK && r.data != null) {
            val uri = IntentCompat.getParcelableExtra(r.data!!, RingtoneManager.EXTRA_RINGTONE_PICKED_URI, Uri::class.java)
            onChange(if (uri == null || uri == Settings.System.DEFAULT_ALARM_ALERT_URI) "" else uri.toString())
        }
    }
    Row(
        Modifier.fillMaxWidth().clickable {
            picker.launch(
                Intent(RingtoneManager.ACTION_RINGTONE_PICKER)
                    .putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM or RingtoneManager.TYPE_RINGTONE)
                    .putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Alarm sound")
                    .putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
                    .putExtra(RingtoneManager.EXTRA_RINGTONE_DEFAULT_URI, Settings.System.DEFAULT_ALARM_ALERT_URI)
                    .putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
                    .putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, if (tone.isBlank()) Settings.System.DEFAULT_ALARM_ALERT_URI else Uri.parse(tone)),
            )
        }.padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.MusicNote, null, tint = b.acc)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(label)
            Muted(toneName(tone, defaultName))
        }
        Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, "Choose sound", tint = b.muted)
    }
}

/** Explains and fixes anything that would stop an alarm from ringing on time or on the lock screen. */
@Composable
fun AlarmPermissionNote() {
    val ctx = LocalContext.current
    var tick by remember { mutableIntStateOf(0) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { tick++ }
    val notify = remember(tick) { Reminders.canNotify(ctx) }
    val exact = remember(tick) { Reminders.canExact(ctx) }
    val full = remember(tick) { Reminders.canFullScreen(ctx) }
    if (notify && exact && full) return
    val b = LocalBloom.current
    Column {
        Text("To ring reliably, alarms need:", fontWeight = FontWeight.Medium, color = b.danger)
        if (!notify) {
            Muted("• Notifications turned on")
            OutlinedButton(onClick = {
                ctx.startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName))
            }) { Text("Turn on notifications") }
        }
        if (!exact && Build.VERSION.SDK_INT >= 31) {
            Muted("• “Alarms & reminders”, so they ring at the exact minute")
            OutlinedButton(onClick = {
                ctx.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${ctx.packageName}")))
            }) { Text("Allow alarms") }
        }
        if (!full && Build.VERSION.SDK_INT >= 34) {
            Muted("• Full-screen alerts, so they show on the lock screen")
            OutlinedButton(onClick = {
                ctx.startActivity(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:${ctx.packageName}")))
            }) { Text("Allow full screen") }
        }
    }
}
