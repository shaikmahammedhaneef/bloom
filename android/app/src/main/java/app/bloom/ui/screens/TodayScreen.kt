@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class, ExperimentalFoundationApi::class)

package app.bloom.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import app.bloom.data.Catalog
import app.bloom.data.Dates
import app.bloom.data.HabitDay
import app.bloom.data.HabitLogic
import app.bloom.data.Mood
import app.bloom.data.Todo
import app.bloom.data.TodoLogic
import app.bloom.data.bestByDate
import app.bloom.data.countsByHabit
import app.bloom.data.habitDay
import app.bloom.ui.components.BloomCard
import app.bloom.ui.components.CheckCircle
import app.bloom.ui.components.Muted
import app.bloom.ui.components.ProgressRing
import app.bloom.ui.components.Screen
import app.bloom.ui.components.SectionTitle
import app.bloom.ui.components.ToneIcon
import app.bloom.ui.theme.LocalBloom
import kotlinx.coroutines.launch

private sealed interface Item { val time: String }
private data class HabitItem(val d: HabitDay) : Item { override val time get() = d.habit.startTime }
private data class TodoItem(val t: Todo, val done: Boolean) : Item { override val time get() = t.startTime }

@Composable
fun TodayScreen(nav: NavHostController) {
    val app = bloomApp()
    val repo = app.repo
    val today = rememberToday()
    var date by remember(today) { mutableStateOf(today) }
    val scope = rememberCoroutineScope()
    val settings by app.settings.flow.collectAsStateWithLifecycle()
    val habits by repo.habitsFlow().collectAsStateWithLifecycle(emptyList())
    val logs by remember(today) { repo.logsFlow(today) }.collectAsStateWithLifecycle(emptyList())
    val todos by repo.todosFlow().collectAsStateWithLifecycle(emptyList())
    val moods by remember(date) { repo.moodsOn(date) }.collectAsStateWithLifecycle(emptyList())
    var points by remember { mutableIntStateOf(0) }
    LaunchedEffect(logs, moods) { points = repo.points() }

    val counts = remember(logs) { countsByHabit(logs) }
    val days = remember(habits, counts, date) {
        habits.map { habitDay(it, counts[it.id] ?: emptyMap(), date) }.filter { it.scheduled }
    }
    val dayTodos = remember(todos, date) { todos.filter { TodoLogic.occursOn(it, date) }.map { TodoItem(it, TodoLogic.doneOn(it, date)) } }
    val items: List<Item> = remember(days, dayTodos) {
        (days.map { HabitItem(it) } + dayTodos).sortedWith { a, b -> HabitLogic.byTime(a.time, b.time) }
    }
    val countable = days.filter { it.habit.repeat != "weekly" || it.done }
    val pct = if (countable.isEmpty()) 0 else countable.count { it.done } * 100 / countable.size
    val mood = bestByDate(moods)[date]
    var menu by remember { mutableStateOf(false) }

    Screen(
        title = if (date == today) "${Dates.greeting()}${if (settings.name.isNotBlank()) ", ${settings.name}" else ""}" else Dates.fmtDay(date),
        subtitle = if (date == today) Dates.fmtLong(date) else if (date < today) "Past day" else "Coming up",
        actions = { IconButton(onClick = { nav.navigate("settings") }) { Icon(Icons.Rounded.Settings, "Settings") } },
        fab = {
            Box {
                FloatingActionButton(onClick = { menu = true }) { Icon(Icons.Rounded.Add, "Add") }
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                    DropdownMenuItem(text = { Text("New habit") }, onClick = { menu = false; nav.navigate("habitForm/0") })
                    DropdownMenuItem(text = { Text("New to-do") }, onClick = { menu = false; nav.navigate("todo/0/$date") })
                    DropdownMenuItem(text = { Text("Add from a template") }, onClick = { menu = false; nav.navigate("templates") })
                }
            }
        },
    ) {
        item { WeekStrip(date, today, onPick = { date = it }) }
        item {
            BloomCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ProgressRing(pct) { Text("$pct%", fontWeight = FontWeight.SemiBold) }
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f)) {
                        Text("${countable.count { it.done }} of ${countable.size} habits done", style = MaterialTheme.typography.titleMedium)
                        Muted("$points points · ${dayTodos.count { it.done }}/${dayTodos.size} to-dos")
                    }
                }
                if (date <= today) {
                    if (mood == null) {
                        Muted("How are you feeling?")
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            for (level in 1..5) {
                                TextButton(onClick = {
                                    scope.launch { repo.saveMood(Mood(date = date, time = if (date == today) Dates.nowTime() else "21:00", level = level)) }
                                }) { Text(Catalog.MOOD_EMOJI[level - 1], fontSize = 26.sp) }
                            }
                        }
                    } else {
                        Row(Modifier.clickable { nav.navigate("mood") }, verticalAlignment = Alignment.CenterVertically) {
                            Text(Catalog.MOOD_EMOJI[mood.level - 1], fontSize = 26.sp)
                            Spacer(Modifier.width(8.dp))
                            Muted("Feeling ${Catalog.MOOD_NAMES[mood.level - 1].lowercase()}${if (moods.size > 1) " · ${moods.size} check-ins" else ""}")
                        }
                    }
                }
            }
        }
        if (items.isEmpty()) {
            item {
                BloomCard {
                    Text("Nothing planned", style = MaterialTheme.typography.titleMedium)
                    Muted("Add a habit or a to-do, or start from a ready-made routine.")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { nav.navigate("templates") }) { Text("Browse templates") }
                        OutlinedButton(onClick = { nav.navigate("habitForm/0") }) { Text("New habit") }
                    }
                }
            }
        }
        val groups = items.groupBy { Dates.partOfDay(it.time) }
        for (part in listOf("morning", "afternoon", "evening", "anytime")) {
            val list = groups[part] ?: continue
            item(key = "h-$part") { SectionTitle(part.replaceFirstChar { it.uppercase() }) }
            items(list, key = { if (it is HabitItem) "h${it.d.habit.id}" else "t${(it as TodoItem).t.id}" }) { it ->
                when (it) {
                    is HabitItem -> HabitCard(it.d, date, nav)
                    is TodoItem -> TodoCard(it, date, nav)
                }
            }
        }
    }
}

@Composable
private fun WeekStrip(date: String, today: String, onPick: (String) -> Unit) {
    val b = LocalBloom.current
    val ws = Dates.weekStart(date)
    Row(verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = { onPick(Dates.add(date, -7)) }) { Icon(Icons.AutoMirrored.Rounded.KeyboardArrowLeft, "Previous week") }
        Row(Modifier.weight(1f), horizontalArrangement = Arrangement.SpaceBetween) {
            for (i in 0 until 7) {
                val k = Dates.add(ws, i)
                val sel = k == date
                Column(
                    Modifier.clip(RoundedCornerShape(14.dp)).background(if (sel) b.acc else b.bg).clickable { onPick(k) }.padding(horizontal = 8.dp, vertical = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(Dates.dayLetter(k).take(2), fontSize = 12.sp, color = if (sel) b.onAcc else b.muted)
                    Text(Dates.parse(k).dayOfMonth.toString(), fontWeight = if (k == today) FontWeight.Bold else FontWeight.Normal, color = if (sel) b.onAcc else b.ink)
                    Box(Modifier.size(4.dp).clip(CircleShape).background(if (k == today && !sel) b.acc else androidx.compose.ui.graphics.Color.Transparent))
                }
            }
        }
        IconButton(onClick = { onPick(Dates.add(date, 7)) }) { Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, "Next week") }
    }
}

@Composable
fun HabitCard(d: HabitDay, date: String, nav: NavHostController) {
    val repo = bloomApp().repo
    val scope = rememberCoroutineScope()
    val h = d.habit
    val b = LocalBloom.current
    BloomCard(Modifier.clickable { nav.navigate("habit/${h.id}") }, padding = 12.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            ToneIcon(h.icon, h.color)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(h.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, textDecoration = if (d.done) TextDecoration.LineThrough else null)
                val sub = listOfNotNull(
                    Dates.timeRange(h.startTime, h.endTime).ifEmpty { null },
                    if (h.repeat == "weekly") "${d.weekDone}/${h.timesPerWeek} this week" else null,
                    if (h.goal > 1) "${d.count}/${h.goal} ${h.unit}".trim() else null,
                ).joinToString(" · ")
                if (sub.isNotEmpty()) Muted(sub)
            }
            if (d.streak > 0) {
                Icon(Icons.Rounded.LocalFireDepartment, null, tint = b.toneFg("peach"), modifier = Modifier.size(18.dp))
                Text("${d.streak}", fontSize = 13.sp, color = b.muted)
            }
            if (h.goal > 1) {
                FilledTonalIconButton(onClick = { scope.launch { repo.addCount(h, date, -1) } }, enabled = d.count > 0) { Icon(Icons.Rounded.Remove, "One less") }
                FilledTonalIconButton(onClick = { scope.launch { repo.addCount(h, date, 1) } }) { Icon(Icons.Rounded.Add, "One more") }
            } else {
                CheckCircle(d.done, if (d.done) "Mark not done" else "Mark done") { scope.launch { repo.toggleHabit(h, date, d.count) } }
            }
        }
    }
}

@Composable
private fun TodoCard(it: TodoItem, date: String, nav: NavHostController) {
    val repo = bloomApp().repo
    val scope = rememberCoroutineScope()
    val t = it.t
    BloomCard(Modifier.combinedClickable(onClick = { nav.navigate("todo/${t.id}/$date") }), padding = 8.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = it.done, onCheckedChange = { scope.launch { repo.toggleTodo(t, date) } })
            Column(Modifier.weight(1f)) {
                Text(t.title, textDecoration = if (it.done) TextDecoration.LineThrough else null)
                val sub = listOfNotNull(
                    Dates.timeRange(t.startTime, t.endTime).ifEmpty { null },
                    when (t.repeat) { "daily" -> "Every day"; "days" -> HabitLogic.daysLabel(t.days); else -> null },
                    "To-do",
                ).joinToString(" · ")
                Muted(sub)
            }
        }
    }
}
