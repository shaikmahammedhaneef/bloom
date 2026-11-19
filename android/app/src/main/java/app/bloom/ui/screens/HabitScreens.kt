@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)

package app.bloom.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import app.bloom.data.Catalog
import app.bloom.data.Dates
import app.bloom.data.Habit
import app.bloom.data.HabitLogic
import app.bloom.LocalAppSnack
import app.bloom.data.QuickAdd
import app.bloom.data.countsByHabit
import app.bloom.data.habitDay
import app.bloom.ui.components.BloomCard
import app.bloom.ui.components.ChoiceChips
import app.bloom.ui.components.ConfirmDialog
import app.bloom.ui.components.DaysPicker
import app.bloom.ui.components.Muted
import app.bloom.ui.components.Pill
import app.bloom.ui.components.Screen
import app.bloom.ui.components.SectionTitle
import app.bloom.ui.components.StatTile
import app.bloom.ui.components.SwipeRow
import app.bloom.ui.components.rememberSnackbar
import app.bloom.ui.components.TimeField
import app.bloom.ui.components.ToneIcon
import app.bloom.ui.components.iconFor
import app.bloom.ui.components.toneName
import app.bloom.ui.components.AlarmToneRow
import app.bloom.ui.components.AlarmPermissionNote
import androidx.compose.material.icons.rounded.Alarm
import androidx.compose.ui.draw.alpha
import app.bloom.ui.theme.LocalBloom
import kotlinx.coroutines.launch

@Composable
fun HabitsScreen(nav: NavHostController) {
    val repo = bloomApp().repo
    val today = rememberToday()
    val habits by repo.habitsFlow().collectAsStateWithLifecycle(emptyList())
    val logs by remember(today) { repo.logsFlow(today) }.collectAsStateWithLifecycle(emptyList())
    val counts = remember(logs) { countsByHabit(logs) }
    var cat by remember { mutableStateOf("all") }
    val b = LocalBloom.current
    val app = bloomApp()
    val scope = rememberCoroutineScope()
    val snack = rememberSnackbar()
    var deleting by remember { mutableStateOf<Habit?>(null) }
    deleting?.let { HabitDeleteDialog(it, today, snack, allowFull = true, onDismiss = { deleting = null }) }

    Screen(
        title = "Habits",
        snackbar = snack,
        actions = { IconButton(onClick = { nav.navigate("templates") }) { Icon(Icons.Rounded.AutoAwesome, "Templates") } },
        fab = { FloatingActionButton(onClick = { nav.navigate("habitForm/0") }) { Icon(Icons.Rounded.Add, "New habit") } },
    ) {
        item { ChoiceChips(listOf("all" to "All") + Catalog.CATEGORIES.map { it.key to it.name }, { it == cat }) { cat = it } }
        val all = habits.filter { cat == "all" || it.category == cat }.sortedWith { x, y -> HabitLogic.byTime(x.startTime, y.startTime) }
        val list = all.filter { !HabitLogic.ended(it, today) }
        val stopped = all.filter { HabitLogic.ended(it, today) }
        if (list.isEmpty()) item {
            BloomCard {
                Text("No habits yet", style = MaterialTheme.typography.titleMedium)
                Muted("Start small: one habit you can do in two minutes.")
                Button(onClick = { nav.navigate("habitForm/0") }) { Text("New habit") }
            }
        }
        items(list, key = { it.id }) { h ->
            val c = counts[h.id] ?: emptyMap()
            val d = habitDay(h, c, today)
            val rate = HabitLogic.completionRate(h, c, today)
            SwipeRow(
                onDelete = { deleting = h },
                asksFirst = true,
                onDone = if (d.scheduled) ({ scope.launch { repo.toggleHabit(h, today, d.count) } }) else null,
                doneLabel = if (d.done) "Not done today" else "Done today",
            ) {
            BloomCard(Modifier.clickable { nav.navigate("habit/${h.id}") }, padding = 12.dp) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ToneIcon(h.icon, h.color)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(h.name, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Muted(listOfNotNull(HabitLogic.repeatLabel(h), Dates.timeRange(h.startTime, h.endTime).ifEmpty { null }, rate?.let { "$it% in 30 days" }).joinToString(" · "))
                    }
                    if (h.alarm && h.startTime.isNotEmpty()) Icon(Icons.Rounded.Alarm, "Alarm on", tint = b.muted, modifier = Modifier.size(18.dp))
                    else if (h.reminder && h.startTime.isNotEmpty()) Icon(Icons.Rounded.NotificationsActive, "Reminder on", tint = b.muted, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Icon(Icons.Rounded.LocalFireDepartment, null, tint = b.toneFg("peach"), modifier = Modifier.size(18.dp))
                    Text("${d.streak}${if (d.streakUnit == "week") "w" else ""}", fontSize = 13.sp)
                }
            }
            }
        }
        if (stopped.isNotEmpty()) {
            item { SectionTitle("Stopped") }
            item { Muted("Their history still counts toward your progress. Open one to start it again.") }
            items(stopped, key = { "s" + it.id }) { h ->
                SwipeRow(onDelete = { deleting = h }, asksFirst = true) {
                    BloomCard(Modifier.clickable { nav.navigate("habit/${h.id}") }, padding = 12.dp) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.alpha(0.5f)) { ToneIcon(h.icon, h.color) }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(h.name, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis, color = b.muted)
                                Muted("Stopped after ${Dates.fmtDay(h.endDate)}")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun HabitDetailScreen(nav: NavHostController, id: Long) {
    val repo = bloomApp().repo
    val today = rememberToday()
    val scope = rememberCoroutineScope()
    val habit by remember(id) { repo.habitFlow(id) }.collectAsStateWithLifecycle(null)
    val logs by remember(today) { repo.logsFlow(today) }.collectAsStateWithLifecycle(emptyList())
    var confirm by remember { mutableStateOf(false) }
    val h = habit ?: run {
        Screen("Habit", onBack = { nav.popBackStack() }) { item { Muted("This habit was deleted.") } }
        return
    }
    val counts = remember(logs, id) { logs.filter { it.habitId == id }.associate { it.date to it.count } }
    val s = HabitLogic.streaks(h, counts, today)
    val rate = HabitLogic.completionRate(h, counts, today)
    val total = counts.count { it.value >= maxOf(1, h.goal) }
    val b = LocalBloom.current

    val snack = LocalAppSnack.current
    // Deleting leaves this page; the Undo message shows on the page you go back to.
    if (confirm) HabitDeleteDialog(h, today, snack, allowFull = true, onDismiss = { confirm = false }) { nav.popBackStack() }
    val stoppedHabit = HabitLogic.ended(h, today)

    Screen(
        title = h.name, onBack = { nav.popBackStack() },
        actions = {
            IconButton(onClick = { nav.navigate("habitForm/${h.id}") }) { Icon(Icons.Rounded.Edit, "Edit habit") }
            IconButton(onClick = { confirm = true }) { Icon(Icons.Rounded.Delete, "Delete habit") }
        },
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                ToneIcon(h.icon, h.color, 56.dp)
                Spacer(Modifier.width(14.dp))
                Column {
                    Text(HabitLogic.repeatLabel(h), style = MaterialTheme.typography.titleMedium)
                    Muted(listOfNotNull(Dates.timeRange(h.startTime, h.endTime).ifEmpty { "Any time" }, if (h.goal > 1) "Goal ${h.goal} ${h.unit}".trim() else null).joinToString(" · "))
                    if (stoppedHabit) Pill("Stopped after ${Dates.fmtDay(h.endDate)}", "honey")
                    else if (h.alarm && h.startTime.isNotEmpty()) Pill("Alarm at ${Dates.fmtTime(h.startTime)} · ${toneName(h.alarmTone)}")
                    else if (h.reminder && h.startTime.isNotEmpty()) Pill("Reminder at ${Dates.fmtTime(h.startTime)}")
                }
            }
        }
        if (stoppedHabit) item {
            BloomCard {
                Text("This habit is stopped", style = MaterialTheme.typography.titleMedium)
                Muted("It no longer shows on Today or sends reminders. Its history below still counts.")
                Button(onClick = { scope.launch { repo.resumeHabit(h) } }) { Text("Start again from today") }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile("${s.current}${if (s.unit == "week") " wk" else ""}", "Current streak", Modifier.weight(1f))
                StatTile("${s.best}${if (s.unit == "week") " wk" else ""}", "Best streak", Modifier.weight(1f))
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile(rate?.let { "$it%" } ?: "—", "Last 30 days", Modifier.weight(1f))
                StatTile("$total", "Times done", Modifier.weight(1f))
            }
        }
        item {
            BloomCard {
                Text("Last 16 weeks", style = MaterialTheme.typography.titleMedium)
                Muted("Tap a day to mark it done or not done.")
                val start = Dates.add(Dates.weekStart(today), -7 * 15)
                Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                    for (w in 0 until 16) {
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            for (d in 0 until 7) {
                                val k = Dates.add(start, w * 7 + d)
                                val c = counts[k] ?: 0
                                val level = if (c == 0) 0 else minOf(4, 1 + (c * 3) / maxOf(1, h.goal))
                                val future = k > today
                                Box(
                                    Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(3.dp))
                                        .background(if (future) Color.Transparent else b.heat[level])
                                        .then(if (k == today) Modifier.border(1.5.dp, b.ink, RoundedCornerShape(3.dp)) else Modifier)
                                        .clickable(enabled = !future && HabitLogic.isScheduled(h, k) || c > 0) {
                                            scope.launch { repo.setCount(h, k, if (c >= maxOf(1, h.goal)) 0 else maxOf(1, h.goal)) }
                                        },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun HabitFormScreen(nav: NavHostController, id: Long, title: String = "") {
    val repo = bloomApp().repo
    val scope = rememberCoroutineScope()
    var h by remember {
        mutableStateOf<Habit?>(
            if (id == 0L) QuickAdd.guessIcon(title).let { (icon, color) -> Habit(name = title, icon = icon, color = color, reminder = true) } else null,
        )
    }
    var error by remember { mutableStateOf<String?>(null) }
    // New habits pick an icon from their name until you choose one yourself.
    var iconChosen by remember { mutableStateOf(id != 0L) }
    var more by remember { mutableStateOf(false) }
    LaunchedEffect(id) { if (id != 0L) h = repo.dao.habit(id) }
    val f = h ?: return
    fun set(x: Habit) { h = x; error = null }
    val b = LocalBloom.current

    fun save() {
        error = when {
            f.name.isBlank() -> "Give the habit a name."
            f.repeat == "days" && f.days.isEmpty() -> "Pick at least one day."
            else -> null
        }
        if (error == null) scope.launch {
            val newId = repo.saveHabit(f)
            nav.popBackStack()
            if (id == 0L) nav.navigate("habit/$newId")
        }
    }

    Screen(title = if (id == 0L) "New habit" else "Edit habit", onBack = { nav.popBackStack() }) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                ToneIcon(f.icon, f.color, 52.dp)
                Spacer(Modifier.width(12.dp))
                OutlinedTextField(
                    f.name,
                    { v ->
                        val name = v.take(80)
                        set(if (iconChosen) f.copy(name = name) else QuickAdd.guessIcon(name).let { (icon, color) -> f.copy(name = name, icon = icon, color = color) })
                    },
                    Modifier.weight(1f), label = { Text("Habit") }, singleLine = true, placeholder = { Text("e.g. Read 10 pages") },
                )
            }
        }
        item {
            BloomCard {
                Text("How often?", fontWeight = FontWeight.Medium)
                ChoiceChips(listOf("daily" to "Every day", "days" to "Some days", "weekly" to "Times a week"), { it == f.repeat }) {
                    set(f.copy(repeat = it, days = if (it == "days" && f.days.isEmpty()) listOf(1, 2, 3, 4, 5) else f.days))
                }
                if (f.repeat == "days") DaysPicker(f.days) { set(f.copy(days = it)) }
                if (f.repeat == "weekly") {
                    Muted("${f.timesPerWeek} times a week")
                    Slider(f.timesPerWeek.toFloat(), { set(f.copy(timesPerWeek = it.toInt())) }, valueRange = 1f..7f, steps = 5)
                }
            }
        }
        item {
            BloomCard {
                Text("When?", fontWeight = FontWeight.Medium)
                Row {
                    TimeField("From", f.startTime, Modifier.weight(1f)) { set(f.copy(startTime = it, endTime = if (it.isEmpty()) "" else f.endTime)) }
                    if (f.startTime.isNotEmpty()) TimeField("To (optional)", f.endTime, Modifier.weight(1f)) { set(f.copy(endTime = it)) }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Remind me")
                        Muted(if (f.startTime.isEmpty()) "Set a time to get a reminder." else "At ${Dates.fmtTime(f.startTime)}, with Done and Snooze buttons.")
                    }
                    Switch((f.reminder || f.alarm) && f.startTime.isNotEmpty(), { set(f.copy(reminder = it, alarm = if (it) f.alarm else false)) }, enabled = f.startTime.isNotEmpty())
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Ring as an alarm")
                        Muted("Plays a sound until you answer, even on the lock screen.")
                    }
                    Switch(f.alarm && f.startTime.isNotEmpty(), { set(f.copy(alarm = it, reminder = it || f.reminder)) }, enabled = f.startTime.isNotEmpty())
                }
                if (f.alarm && f.startTime.isNotEmpty()) {
                    AlarmToneRow("Alarm sound", f.alarmTone, "Same as in Settings") { set(f.copy(alarmTone = it)) }
                    AlarmPermissionNote()
                }
            }
        }
        item {
            TextButton(onClick = { more = !more }) {
                Icon(if (more) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore, null)
                Spacer(Modifier.width(6.dp))
                Text(if (more) "Fewer options" else "Icon, color, category and daily goal")
            }
        }
        if (more) {
            item {
                BloomCard {
                    Text("Icon", fontWeight = FontWeight.Medium)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        for (ic in Catalog.ICONS) {
                            val sel = ic == f.icon
                            Box(
                                Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).background(if (sel) b.toneBg(f.color) else b.surf)
                                    .border(if (sel) 2.dp else 1.dp, if (sel) b.toneFg(f.color) else b.line, RoundedCornerShape(12.dp))
                                    .clickable { iconChosen = true; set(f.copy(icon = ic)) },
                                contentAlignment = Alignment.Center,
                            ) { Icon(iconFor(ic), ic, tint = if (sel) b.toneFg(f.color) else b.muted) }
                        }
                    }
                    Text("Color", fontWeight = FontWeight.Medium)
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        for (t in Catalog.TONES) {
                            Box(
                                Modifier.size(34.dp).clip(CircleShape).background(b.toneBg(t.key))
                                    .border(if (t.key == f.color) 3.dp else 1.dp, if (t.key == f.color) b.toneFg(t.key) else b.line, CircleShape)
                                    .clickable { iconChosen = true; set(f.copy(color = t.key)) },
                            )
                        }
                    }
                    Text("Category", fontWeight = FontWeight.Medium)
                    ChoiceChips(Catalog.CATEGORIES.map { it.key to it.name }, { it == f.category }) { set(f.copy(category = it)) }
                    Text("Daily goal", fontWeight = FontWeight.Medium)
                    Muted("For things you count, like 8 glasses of water.")
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            f.goal.toString(), { v -> v.filter { it.isDigit() }.take(3).toIntOrNull()?.let { set(f.copy(goal = it.coerceIn(1, 100))) } },
                            Modifier.weight(1f), label = { Text("Times a day") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        )
                        OutlinedTextField(f.unit, { set(f.copy(unit = it.take(20))) }, Modifier.weight(1f), label = { Text("Unit") }, singleLine = true, placeholder = { Text("glasses") })
                    }
                }
            }
        }
        if (error != null) item { Text(error!!, color = MaterialTheme.colorScheme.error) }
        item { Button(onClick = { save() }, Modifier.fillMaxWidth()) { Text(if (id == 0L) "Add habit" else "Save") } }
    }
}

@Composable
fun TemplatesScreen(nav: NavHostController) {
    val repo = bloomApp().repo
    val scope = rememberCoroutineScope()
    var kind by remember { mutableStateOf("All") }
    var msg by remember { mutableStateOf<String?>(null) }
    val kinds = listOf("All") + Catalog.TEMPLATES.map { it.kind }.distinct()
    Screen(title = "Templates", subtitle = "Ready-made routines, all with times", onBack = { nav.popBackStack() }) {
        item { ChoiceChips(kinds.map { it to it }, { it == kind }) { kind = it } }
        if (msg != null) item { Pill(msg!!) }
        items(Catalog.TEMPLATES.filter { kind == "All" || it.kind == kind }, key = { it.key }) { t ->
            BloomCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ToneIcon(t.icon, t.tone)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(t.name, style = MaterialTheme.typography.titleMedium)
                        Muted(t.desc)
                    }
                }
                for (x in t.habits) Muted("• ${x.name} — ${Dates.timeRange(x.startTime, x.endTime)}${if (x.repeat == "days") " (${HabitLogic.daysLabel(x.days)})" else ""}")
                OutlinedButton(onClick = {
                    scope.launch {
                        val n = repo.applyTemplate(t.key)
                        msg = if (n == 0) "You already have all of “${t.name}”." else "Added $n habit${if (n == 1) "" else "s"} from “${t.name}”, with reminders on."
                    }
                }) { Text("Add ${t.habits.size} habits") }
            }
        }
    }
}
