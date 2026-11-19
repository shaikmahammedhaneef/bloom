@file:OptIn(ExperimentalMaterial3Api::class)

package app.bloom.ui.screens

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings as AndroidSettings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import app.bloom.data.Backup
import app.bloom.data.Catalog
import app.bloom.data.Dates
import app.bloom.reminders.AlarmService
import app.bloom.reminders.Reminders
import app.bloom.ui.components.AlarmPermissionNote
import app.bloom.ui.components.AlarmToneRow
import app.bloom.reminders.test
import app.bloom.ui.components.BloomCard
import app.bloom.ui.components.ChoiceChips
import app.bloom.ui.components.ConfirmDialog
import app.bloom.ui.components.Muted
import app.bloom.ui.components.Screen
import app.bloom.ui.components.SectionTitle
import app.bloom.ui.components.TimeField
import app.bloom.ui.theme.bloomColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun SettingsScreen(nav: NavHostController) {
    val app = bloomApp()
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val s by app.settings.flow.collectAsStateWithLifecycle()
    fun update(f: (app.bloom.data.Settings) -> app.bloom.data.Settings) { app.settings.update(f); app.requestReschedule() }
    var canNotify by remember { mutableStateOf(Reminders.canNotify(ctx)) }
    var canExact by remember { mutableStateOf(Reminders.canExact(ctx)) }
    var refresh by remember { mutableIntStateOf(0) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { canNotify = Reminders.canNotify(ctx); canExact = Reminders.canExact(ctx); refresh++ }
    var msg by remember { mutableStateOf<String?>(null) }
    var restoreUri by remember { mutableStateOf<Uri?>(null) }
    var csvKind by remember { mutableStateOf("habits") }

    val askNotify = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { canNotify = Reminders.canNotify(ctx) }
    val backup = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) scope.launch {
            msg = runCatching {
                val json = Backup.export(app.repo.dao, app.settings.value)
                withContext(Dispatchers.IO) { ctx.contentResolver.openOutputStream(uri)!!.use { it.write(json.toByteArray()) } }
                "Backup saved."
            }.getOrElse { "Couldn't save the backup: ${it.message}" }
        }
    }
    val restore = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri -> restoreUri = uri }
    val csv = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        if (uri != null) scope.launch {
            msg = runCatching {
                val text = Backup.csv(app.repo.dao, csvKind)
                withContext(Dispatchers.IO) { ctx.contentResolver.openOutputStream(uri)!!.use { it.write(text.toByteArray()) } }
                "Exported."
            }.getOrElse { "Couldn't export: ${it.message}" }
        }
    }
    restoreUri?.let { uri ->
        ConfirmDialog("Restore this backup?", "Everything in Bloom now is replaced by what's in the file.", "Restore", {
            scope.launch {
                msg = runCatching {
                    val json = withContext(Dispatchers.IO) { ctx.contentResolver.openInputStream(uri)!!.use { it.readBytes().decodeToString() } }
                    Backup.restore(app.repo.dao, app.settings, json)
                    app.requestReschedule()
                    "Backup restored."
                }.getOrElse { it.message ?: "That file couldn't be read." }
            }
        }) { restoreUri = null }
    }

    Screen(title = "Settings", onBack = { nav.popBackStack() }) {
        if (msg != null) item { BloomCard { Text(msg!!) } }
        item {
            BloomCard {
                var name by remember { mutableStateOf(s.name) }
                OutlinedTextField(name, { name = it.take(60); update { x -> x.copy(name = name.trim()) } }, Modifier.fillMaxWidth(), label = { Text("Your name") }, singleLine = true)
                Muted("No account and no sign-in: everything stays on this phone.")
            }
        }

        item { SectionTitle("Reminders") }
        item {
            BloomCard {
                if (!canNotify) {
                    Text("Notifications are off", fontWeight = FontWeight.Medium)
                    Muted("Allow notifications so reminders can reach you.")
                    Button(onClick = {
                        if (Build.VERSION.SDK_INT >= 33) askNotify.launch(Manifest.permission.POST_NOTIFICATIONS)
                        else ctx.startActivity(Intent(AndroidSettings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(AndroidSettings.EXTRA_APP_PACKAGE, ctx.packageName))
                    }) { Text("Allow notifications") }
                    HorizontalDivider()
                }
                if (!canExact && Build.VERSION.SDK_INT >= 31) {
                    Text("Reminders may be a few minutes late", fontWeight = FontWeight.Medium)
                    Muted("Turn on “Alarms & reminders” for Bloom so reminders arrive at the exact minute.")
                    OutlinedButton(onClick = {
                        ctx.startActivity(Intent(AndroidSettings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${ctx.packageName}")))
                    }) { Text("Allow exact reminders") }
                    HorizontalDivider()
                }
                Toggle("Habit and to-do reminders", "At the 'from' time of anything with a reminder on", s.remindRoutine) { v -> update { it.copy(remindRoutine = v) } }
                Toggle("Daily mood check-in", "Log your mood straight from the notification", s.remindMood) { v -> update { it.copy(remindMood = v) } }
                if (s.remindMood) TimeField("Check-in time", s.moodTime, clearable = false) { v -> update { it.copy(moodTime = v) } }
                Toggle("Streak reminders", "If a streak of 3+ days is about to break", s.remindStreak) { v -> update { it.copy(remindStreak = v) } }
                if (s.remindStreak) TimeField("Streak reminder time", s.streakTime, clearable = false) { v -> update { it.copy(streakTime = v) } }
                Muted("Snooze for")
                ChoiceChips(listOf(5, 10, 15, 30).map { it to "$it min" }, { it == s.snoozeMinutes }) { v -> update { it.copy(snoozeMinutes = v) } }
                TextButton(onClick = { Reminders.test(ctx); msg = if (canNotify) "A test notification was sent." else "Allow notifications first." }) { Text("Send a test notification") }
            }
        }

        item { SectionTitle("Alarms") }
        item {
            BloomCard {
                Muted("Turn on “Ring as an alarm” for any habit or to-do with a time. It rings with a sound and vibration, on the lock screen too, until you tap Done, Snooze or Stop.")
                AlarmToneRow("Default alarm sound", s.alarmTone, "Phone's default alarm") { v -> update { it.copy(alarmTone = v) } }
                Toggle("Vibrate", "Vibrate while the alarm rings", s.alarmVibrate) { v -> update { it.copy(alarmVibrate = v) } }
                Muted("Stop ringing after")
                ChoiceChips(listOf(1, 3, 5, 10).map { it to "$it min" }, { it == s.alarmMinutes }) { v -> update { it.copy(alarmMinutes = v) } }
                AlarmPermissionNote()
                TextButton(onClick = {
                    msg = if (!Reminders.canNotify(ctx)) "Allow notifications first."
                    else if (AlarmService.start(ctx, AlarmService.Alarm("test", "test", 0, Dates.today(), "Test alarm", "This is how your alarms ring.", s.alarmTone))) null
                    else "Android didn't let the alarm start. Try again with Bloom open."
                }) { Text("Try the alarm") }
            }
        }

        item { SectionTitle("Appearance") }
        item {
            BloomCard {
                Muted("Accent color")
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    for ((key, label) in Catalog.ACCENTS) {
                        val c = bloomColors(key, false).acc
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(
                                Modifier.size(40.dp).background(c, CircleShape)
                                    .border(if (key == s.accent) 3.dp else 0.dp, MaterialTheme.colorScheme.onBackground, CircleShape)
                                    .clickable { update { it.copy(accent = key) } },
                            )
                            Text(label, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
                Muted("Theme")
                ChoiceChips(listOf("system" to "Match phone", "light" to "Light", "dark" to "Dark"), { it == s.theme }) { v -> update { it.copy(theme = v) } }
            }
        }

        item { SectionTitle("Daily goals") }
        item {
            BloomCard {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    var water by remember { mutableStateOf(s.waterGoal.toString()) }
                    var steps by remember { mutableStateOf(s.stepGoal.toString()) }
                    OutlinedTextField(water, { v -> water = v.filter(Char::isDigit).take(2); water.toIntOrNull()?.let { n -> update { it.copy(waterGoal = n.coerceIn(1, 30)) } } }, Modifier.weight(1f), label = { Text("Water (glasses)") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    OutlinedTextField(steps, { v -> steps = v.filter(Char::isDigit).take(6); steps.toIntOrNull()?.let { n -> update { it.copy(stepGoal = n.coerceIn(500, 100000)) } } }, Modifier.weight(1f), label = { Text("Steps") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                }
            }
        }

        item { SectionTitle("Your data") }
        item {
            BloomCard {
                Text("Backup", fontWeight = FontWeight.Medium)
                Muted("Save everything to one file (Drive, Downloads, anywhere), and restore it on a new phone. Android's own backup also copies Bloom's data if you have it turned on.")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { backup.launch("bloom-backup-${Dates.today()}.json") }) { Text("Back up") }
                    OutlinedButton(onClick = { restore.launch(arrayOf("application/json", "application/octet-stream", "text/plain")) }) { Text("Restore") }
                }
                HorizontalDivider()
                Text("Export as CSV", fontWeight = FontWeight.Medium)
                Muted("For spreadsheets.")
                ChoiceChips(Backup.CSV_KINDS, { it == csvKind }) { csvKind = it }
                OutlinedButton(onClick = { csv.launch("bloom-$csvKind.csv") }) { Text("Export ${Backup.CSV_KINDS.first { it.first == csvKind }.second.lowercase()}") }
            }
        }
        item { Muted("Bloom ${runCatching { ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName }.getOrNull() ?: ""} · free, no ads, no account") }
    }
}

@Composable
private fun Toggle(title: String, sub: String, value: Boolean, onChange: (Boolean) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.Medium)
            Muted(sub)
        }
        Switch(value, onChange)
    }
}
