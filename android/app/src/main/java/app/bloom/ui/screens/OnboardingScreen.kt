@file:OptIn(ExperimentalLayoutApi::class)

package app.bloom.ui.screens

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.bloom.data.Catalog
import app.bloom.ui.components.BloomCard
import app.bloom.ui.components.Muted
import app.bloom.ui.components.ToneIcon
import app.bloom.ui.components.iconFor
import kotlinx.coroutines.launch

/** First run: name, goals, how you recharge, suggested routines, then notifications. No sign-up. */
@Composable
fun OnboardingScreen() {
    val app = bloomApp()
    val scope = rememberCoroutineScope()
    var step by remember { mutableIntStateOf(0) }
    var name by remember { mutableStateOf("") }
    var goals by remember { mutableStateOf(listOf<String>()) }
    var recharge by remember { mutableStateOf("") }
    var picked by remember { mutableStateOf<List<String>?>(null) }
    val finish = {
        scope.launch {
            for (k in picked ?: emptyList()) app.repo.applyTemplate(k)
            app.settings.update { it.copy(onboarded = true, name = name.trim(), goals = goals, recharge = recharge) }
            app.requestReschedule()
        }
        Unit
    }
    val askNotify = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { finish() }

    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(Modifier.safeDrawingPadding().padding(20.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            LinearProgressIndicator({ (step + 1) / 5f }, Modifier.fillMaxWidth())
            when (step) {
                0 -> {
                    Spacer(Modifier.height(24.dp))
                    Text("🌸", style = MaterialTheme.typography.displayMedium)
                    Text("Welcome to Bloom", style = MaterialTheme.typography.headlineMedium)
                    Muted("Plan your routines, track habits and mood, and look after yourself. No account needed — your data stays on this phone.")
                    OutlinedTextField(name, { name = it.take(60) }, Modifier.fillMaxWidth(), label = { Text("What should we call you?") }, singleLine = true)
                }
                1 -> {
                    Text("What would you like to work on?", style = MaterialTheme.typography.headlineSmall)
                    Muted("Pick up to 3.")
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        for (g in Catalog.GOALS) FilterChip(
                            g.key in goals,
                            { goals = if (g.key in goals) goals - g.key else if (goals.size < 3) goals + g.key else goals },
                            { Text(g.name) },
                            leadingIcon = { Icon(iconFor(g.icon), null, Modifier.size(18.dp)) },
                        )
                    }
                }
                2 -> {
                    Text("How do you recharge?", style = MaterialTheme.typography.headlineSmall)
                    for (r in Catalog.RECHARGE) FilterChip(r == recharge, { recharge = r }, { Text(r) }, Modifier.fillMaxWidth())
                }
                3 -> {
                    val p = picked ?: Catalog.suggestTemplates(goals).also { picked = it }
                    Text("Start with a routine?", style = MaterialTheme.typography.headlineSmall)
                    Muted("We picked these for your goals. You can change everything later.")
                    for (t in Catalog.TEMPLATES.sortedByDescending { it.key in Catalog.suggestTemplates(goals) }.take(6)) {
                        BloomCard(padding = 12.dp) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                ToneIcon(t.icon, t.tone)
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(t.name, fontWeight = FontWeight.Medium)
                                    Muted("${t.habits.size} habits · ${t.desc}")
                                }
                                Checkbox(t.key in p, { picked = if (it) p + t.key else p - t.key })
                            }
                        }
                    }
                }
                else -> {
                    Spacer(Modifier.height(24.dp))
                    Text("🔔", style = MaterialTheme.typography.displayMedium)
                    Text("Get gentle reminders", style = MaterialTheme.typography.headlineSmall)
                    Muted("Bloom reminds you at each habit's start time, asks how you feel in the evening, and nudges you before a streak breaks. Tick things off right from the notification.")
                }
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                if (step > 0) TextButton(onClick = { step-- }) { Text("Back") }
                Spacer(Modifier.weight(1f))
                if (step < 4) Button(onClick = { step++ }) { Text("Continue") }
                else {
                    TextButton(onClick = finish) { Text("Not now") }
                    Button(onClick = {
                        if (Build.VERSION.SDK_INT >= 33) askNotify.launch(Manifest.permission.POST_NOTIFICATIONS) else finish()
                    }) { Text("Turn on reminders") }
                }
            }
        }
    }
}
