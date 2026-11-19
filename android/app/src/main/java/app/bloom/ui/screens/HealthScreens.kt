@file:OptIn(ExperimentalMaterial3Api::class)

package app.bloom.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import app.bloom.data.Catalog
import app.bloom.data.Dates
import app.bloom.data.Health
import app.bloom.ui.components.BarChart
import app.bloom.ui.components.BloomCard
import app.bloom.ui.components.ChoiceChips
import app.bloom.ui.components.Muted
import app.bloom.ui.components.Screen
import app.bloom.ui.components.TimeField
import app.bloom.ui.components.ToneIcon
import app.bloom.ui.theme.LocalBloom
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun HealthScreen(nav: NavHostController) {
    val app = bloomApp()
    val repo = app.repo
    val today = rememberToday()
    val scope = rememberCoroutineScope()
    val settings by app.settings.flow.collectAsStateWithLifecycle()
    var date by remember(today) { mutableStateOf(today) }
    val day by remember(date) { repo.healthOn(date) }.collectAsStateWithLifecycle(null)
    val week by remember(today) { repo.healthSince(Dates.add(today, -29)) }.collectAsStateWithLifecycle(emptyList())
    val h = day ?: Health(date)
    var steps by remember(date, day?.steps) { mutableStateOf(if ((day?.steps ?: 0) > 0) day!!.steps.toString() else "") }
    var weight by remember(date, day?.weight) { mutableStateOf(day?.weight?.toString() ?: "") }
    var weightError by remember { mutableStateOf<String?>(null) }
    val b = LocalBloom.current

    Screen(title = "Health") {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { date = Dates.add(date, -1) }) { Icon(Icons.AutoMirrored.Rounded.KeyboardArrowLeft, "Previous day") }
                Text(if (date == today) "Today" else Dates.fmtDay(date), Modifier.weight(1f), textAlign = TextAlign.Center, style = MaterialTheme.typography.titleMedium)
                IconButton(onClick = { date = Dates.add(date, 1) }, enabled = date < today) { Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, "Next day") }
            }
        }
        item {
            BloomCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ToneIcon("drop", "sky")
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Water", style = MaterialTheme.typography.titleMedium)
                        Muted("${h.water} of ${settings.waterGoal} glasses")
                    }
                    FilledTonalIconButton(onClick = { scope.launch { repo.updateHealth(date) { it.copy(water = (it.water - 1).coerceAtLeast(0)) } } }, enabled = h.water > 0) { Icon(Icons.Rounded.Remove, "One glass less") }
                    FilledTonalIconButton(onClick = { scope.launch { repo.updateHealth(date) { it.copy(water = (it.water + 1).coerceAtMost(40)) } } }) { Icon(Icons.Rounded.Add, "One more glass") }
                }
                LinearProgressIndicator({ (h.water.toFloat() / settings.waterGoal).coerceIn(0f, 1f) }, Modifier.fillMaxWidth(), color = b.water)
            }
        }
        item {
            BloomCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ToneIcon("moon", "lilac")
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Sleep", style = MaterialTheme.typography.titleMedium)
                        Muted(Dates.duration(h.sleepStart, h.sleepEnd)?.let { "${Dates.fmtDur(it)} — the night before ${if (date == today) "today" else Dates.fmtShort(date)}" } ?: "When did you go to bed and wake up?")
                    }
                }
                Row {
                    TimeField("Bedtime", h.sleepStart, Modifier.weight(1f)) { v -> scope.launch { repo.updateHealth(date) { it.copy(sleepStart = v) } } }
                    TimeField("Woke up", h.sleepEnd, Modifier.weight(1f)) { v -> scope.launch { repo.updateHealth(date) { it.copy(sleepEnd = v) } } }
                }
            }
        }
        item {
            BloomCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ToneIcon("steps", "sage")
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Steps", style = MaterialTheme.typography.titleMedium)
                        Muted("${"%,d".format(h.steps)} of ${"%,d".format(settings.stepGoal)}")
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(steps, { steps = it.filter(Char::isDigit).take(6) }, Modifier.weight(1f), singleLine = true, label = { Text("Steps") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    Button(onClick = { scope.launch { repo.updateHealth(date) { it.copy(steps = (steps.toIntOrNull() ?: 0).coerceIn(0, 200000)) } } }) { Text("Save") }
                }
                LinearProgressIndicator({ (h.steps.toFloat() / settings.stepGoal).coerceIn(0f, 1f) }, Modifier.fillMaxWidth(), color = b.steps)
            }
        }
        item {
            BloomCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ToneIcon("pulse", "peach")
                    Spacer(Modifier.width(12.dp))
                    Text("Weight", Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(weight, { weight = it.filter { c -> c.isDigit() || c == '.' }.take(5); weightError = null }, Modifier.weight(1f), singleLine = true, label = { Text("kg") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), isError = weightError != null, supportingText = weightError?.let { { Text(it) } })
                    Button(onClick = {
                        val w = weight.toDoubleOrNull()
                        if (weight.isNotEmpty() && (w == null || w < 20 || w > 400)) weightError = "Enter a weight between 20 and 400 kg."
                        else scope.launch { repo.updateHealth(date) { it.copy(weight = w?.let { x -> Math.round(x * 10) / 10.0 }) } }
                    }) { Text("Save") }
                }
                val ws = week.filter { it.weight != null }
                if (ws.size >= 2) Muted("Last 30 days: ${ws.first().weight} → ${ws.last().weight} kg")
            }
        }
        item {
            BloomCard {
                Text("This week", style = MaterialTheme.typography.titleMedium)
                val keys = (6 downTo 0).map { Dates.add(today, -it) }
                val by = week.associateBy { it.date }
                Muted("Sleep (hours)")
                BarChart(keys.map { k -> by[k]?.let { Dates.duration(it.sleepStart, it.sleepEnd) }?.div(60f) }, keys.map { Dates.dayLetter(it).take(2) }, 10f, b.sleep, 90.dp, goal = 7f)
                Muted("Steps")
                BarChart(keys.map { by[it]?.steps?.toFloat() }, keys.map { Dates.dayLetter(it).take(2) }, maxOf(settings.stepGoal.toFloat(), keys.maxOf { by[it]?.steps ?: 0 }.toFloat()), b.steps, 90.dp, goal = settings.stepGoal.toFloat())
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                BloomCard(Modifier.weight(1f).clickable { nav.navigate("timer/breathe") }) {
                    ToneIcon("wind", "sage"); Text("Breathe", fontWeight = FontWeight.Medium); Muted("3 calming patterns")
                }
                BloomCard(Modifier.weight(1f).clickable { nav.navigate("timer/focus") }) {
                    ToneIcon("target", "lilac"); Text("Focus", fontWeight = FontWeight.Medium); Muted("Pomodoro timer")
                }
            }
        }
    }
}

/** Breathing exercise ("breathe") or Pomodoro focus timer ("focus"). Keeps the screen on while running. */
@Composable
fun TimerScreen(nav: NavHostController, mode: String) {
    val repo = bloomApp().repo
    val scope = rememberCoroutineScope()
    val view = LocalView.current
    var running by remember { mutableStateOf(false) }
    var minutes by remember { mutableIntStateOf(if (mode == "focus") 25 else 3) }
    var left by remember { mutableIntStateOf(minutes * 60) }
    var pattern by remember { mutableStateOf(Catalog.BREATHS[0]) }
    var phase by remember { mutableIntStateOf(0) }
    var phaseLeft by remember { mutableIntStateOf(pattern.phases[0].second) }
    var done by remember { mutableStateOf(false) }
    val b = LocalBloom.current

    DisposableEffect(running) {
        view.keepScreenOn = running
        onDispose { view.keepScreenOn = false }
    }
    LaunchedEffect(running) {
        while (running && left > 0) {
            delay(1000)
            left--
            if (mode == "breathe") {
                phaseLeft--
                if (phaseLeft <= 0) {
                    phase = (phase + 1) % pattern.phases.size
                    phaseLeft = pattern.phases[phase].second
                }
            }
        }
        if (running && left <= 0) {
            running = false
            done = true
            scope.launch { repo.addSession(mode, minutes, if (mode == "breathe") pattern.name else "Focus") }
        }
    }
    val label = pattern.phases[phase].first
    val scale by animateFloatAsState(
        targetValue = if (mode != "breathe" || !running) 0.7f else when (label) { "Breathe in" -> 1f; "Breathe out" -> 0.45f; else -> if (phase > 0 && pattern.phases[phase - 1].first == "Breathe in") 1f else 0.45f },
        animationSpec = tween(if (running) pattern.phases[phase].second * 1000 else 300), label = "breath",
    )

    Screen(title = if (mode == "focus") "Focus timer" else "Breathe", onBack = { nav.popBackStack() }) {
        if (mode == "breathe") item {
            ChoiceChips(Catalog.BREATHS.map { it to it.name }, { it.key == pattern.key }) { if (!running) { pattern = it; phase = 0; phaseLeft = it.phases[0].second } }
            Muted(pattern.desc)
        }
        item {
            ChoiceChips((if (mode == "focus") listOf(15, 25, 50) else listOf(1, 3, 5)).map { it to "$it min" }, { it == minutes }) {
                if (!running) { minutes = it; left = it * 60; done = false }
            }
        }
        item {
            Box(Modifier.fillMaxWidth().height(280.dp), contentAlignment = Alignment.Center) {
                Canvas(Modifier.size(260.dp)) {
                    val r = size.minDimension / 2
                    drawCircle(b.accSoft, r)
                    val frac = if (mode == "breathe") scale else left / (minutes * 60f)
                    drawCircle(b.acc.copy(alpha = 0.85f), r * (if (mode == "breathe") frac else 0.35f + 0.65f * frac))
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    if (mode == "breathe" && running) Text(label, color = b.onAcc, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
                    Text("%d:%02d".format(left / 60, left % 60), color = if (mode == "breathe" && running) b.onAcc else b.ink, fontSize = 34.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally)) {
                Button(onClick = { if (left <= 0) left = minutes * 60; done = false; running = !running }) { Text(if (running) "Pause" else if (left < minutes * 60 && left > 0) "Resume" else "Start") }
                OutlinedButton(onClick = { running = false; left = minutes * 60; phase = 0; phaseLeft = pattern.phases[0].second; done = false }) { Text("Reset") }
            }
        }
        if (done) item { BloomCard { Text("Nice work", style = MaterialTheme.typography.titleMedium); Muted("$minutes minutes saved to your progress (+5 points).") } }
        if (mode == "focus") item { Muted("Keep Bloom open while the timer runs; the screen stays on.", textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) }
        item { TextButton(onClick = { nav.popBackStack() }, Modifier.fillMaxWidth()) { Text("Back to Health") } }
    }
}
