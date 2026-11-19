@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)

package app.bloom.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Alarm
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import app.bloom.data.Catalog
import app.bloom.data.Counts
import app.bloom.data.Dates
import app.bloom.data.Habit
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
import app.bloom.ui.components.SwipeRow
import app.bloom.ui.components.ToneIcon
import app.bloom.ui.components.rememberSnackbar
import app.bloom.ui.theme.LocalBloom
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.launch

private sealed interface Item { val time: String }
private data class HabitItem(val d: HabitDay) : Item { override val time get() = d.habit.startTime }
private data class TodoItem(val t: Todo, val done: Boolean) : Item { override val time get() = t.startTime }

/** Share of a day's habits that were done, or null if there was nothing to do (or it's in the future). */
private fun dayDone(habits: List<Habit>, counts: Map<Long, Counts>, k: String, today: String): Float? {
    if (k > today) return null
    var s = 0
    var d = 0
    for (h in habits) {
        if (!HabitLogic.isScheduled(h, k)) continue
        val done = HabitLogic.doneOn(h, counts[h.id] ?: emptyMap(), k)
        if (h.repeat == "weekly" && !done) continue
        s++
        if (done) d++
    }
    return if (s == 0) null else d.toFloat() / s
}

@Composable
fun TodayScreen(nav: NavHostController) {
    val app = bloomApp()
    val repo = app.repo
    val today = rememberToday()
    var date by remember(today) { mutableStateOf(today) }
    val scope = rememberCoroutineScope()
    val snack = rememberSnackbar()
    val settings by app.settings.flow.collectAsStateWithLifecycle()
    val habits by repo.habitsFlow().collectAsStateWithLifecycle(emptyList())
    val logs by remember(today) { repo.logsFlow(today) }.collectAsStateWithLifecycle(emptyList())
    val todos by repo.todosFlow().collectAsStateWithLifecycle(emptyList())
    val moods by remember(date) { repo.moodsOn(date) }.collectAsStateWithLifecycle(emptyList())
    var points by remember { mutableIntStateOf(0) }
    var adding by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<Habit?>(null) }
    LaunchedEffect(logs, moods) { points = repo.points() }

    val counts = remember(logs) { countsByHabit(logs) }
    val days = remember(habits, counts, date) { habits.map { habitDay(it, counts[it.id] ?: emptyMap(), date) }.filter { it.scheduled } }
    val dayTodos = remember(todos, date) { todos.filter { TodoLogic.occursOn(it, date) }.map { TodoItem(it, TodoLogic.doneOn(it, date)) } }
    val items: List<Item> = remember(days, dayTodos) { (days.map { HabitItem(it) } + dayTodos).sortedWith { a, b -> HabitLogic.byTime(a.time, b.time) } }
    val countable = days.filter { it.habit.repeat != "weekly" || it.done }
    val doneCount = countable.count { it.done } + dayTodos.count { it.done }
    val total = countable.size + dayTodos.size
    val pct = if (total == 0) 0 else doneCount * 100 / total
    val mood = bestByDate(moods)[date]

    deleting?.let { HabitDeleteDialog(it, date, snack, onDismiss = { deleting = null }) }
    if (adding) QuickAddSheet(nav, date, onDismiss = { adding = false }) { msg -> scope.launch { snack.showSnackbar(msg) } }

    val title = when (date) {
        today -> "Today"
        Dates.add(today, 1) -> "Tomorrow"
        Dates.add(today, -1) -> "Yesterday"
        else -> Dates.fmtDay(date)
    }
    Screen(
        title = title,
        subtitle = if (date == today) "${Dates.greeting()}${if (settings.name.isNotBlank()) ", ${settings.name}" else ""}" else Dates.fmtLong(date),
        snackbar = snack,
        actions = {
            if (date != today) TextButton(onClick = { date = today }) { Text("Today") }
            IconButton(onClick = { nav.navigate("settings") }) { Icon(Icons.Rounded.Settings, "Settings") }
        },
        fab = {
            ExtendedFloatingActionButton(onClick = { adding = true }, icon = { Icon(Icons.Rounded.Add, null) }, text = { Text("Add") })
        },
    ) {
        item { WeekPager(date, today, { k -> dayDone(habits, counts, k, today) }) { date = it } }
        item {
            BloomCard(padding = 14.dp) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ProgressRing(pct, 56.dp) { Text("$pct%", fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(if (total == 0) "Nothing planned yet" else "$doneCount of $total done", style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Muted("$points points")
                    }
                    if (mood != null) Text(Catalog.MOOD_EMOJI[mood.level - 1], fontSize = 28.sp, modifier = Modifier.clickable { nav.navigate("mood") })
                }
                if (date <= today && mood == null) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                        Muted("Mood?")
                        for (level in 1..5) {
                            Text(
                                Catalog.MOOD_EMOJI[level - 1], fontSize = 24.sp,
                                modifier = Modifier.clip(CircleShape).clickable {
                                    scope.launch { repo.saveMood(Mood(date = date, time = if (date == today) Dates.nowTime() else "21:00", level = level)) }
                                }.padding(6.dp),
                            )
                        }
                    }
                }
            }
        }
        if (items.isEmpty()) {
            item {
                BloomCard {
                    Text("A clear day", style = MaterialTheme.typography.titleMedium)
                    Muted("Add a to-do or a habit in a few words, or start from a ready-made routine.")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { adding = true }) { Text("Add something") }
                        OutlinedButton(onClick = { nav.navigate("templates") }) { Text("Templates") }
                    }
                }
            }
        } else if (date == today) {
            item { Muted("Swipe right to tick off, left to delete.", Modifier.fillMaxWidth(), textAlign = TextAlign.Center) }
        }
        val groups = items.groupBy { Dates.partOfDay(it.time) }
        for (part in listOf("morning", "afternoon", "evening", "anytime")) {
            val list = groups[part] ?: continue
            item(key = "h-$part") { SectionTitle(part.replaceFirstChar { it.uppercase() }) }
            items(list, key = { if (it is HabitItem) "h${it.d.habit.id}" else "t${(it as TodoItem).t.id}" }) {
                when (it) {
                    is HabitItem -> HabitCard(it.d, date, nav) { deleting = it.d.habit }
                    is TodoItem -> TodoCard(it, date, nav, snack)
                }
            }
        }
    }
}

/** A week of days. Swipe sideways for other weeks; a dot shows how much of each day got done. */
@Composable
private fun WeekPager(date: String, today: String, done: (String) -> Float?, onPick: (String) -> Unit) {
    val b = LocalBloom.current
    val base = Dates.weekStart(today)
    val center = 500
    fun pageOf(d: String) = center + Dates.between(base, Dates.weekStart(d)) / 7
    val pager = rememberPagerState(initialPage = pageOf(date)) { 1000 }
    val current by rememberUpdatedState(date)
    val pick by rememberUpdatedState(onPick)
    LaunchedEffect(date) { if (pager.currentPage != pageOf(date)) pager.animateScrollToPage(pageOf(date)) }
    LaunchedEffect(pager.settledPage) {
        val ws = Dates.add(base, (pager.settledPage - center) * 7)
        // Moving to another week keeps the same weekday selected.
        if (Dates.weekStart(current) != ws) pick(Dates.add(ws, (Dates.dow(current) + 6) % 7))
    }
    Column {
        Text(
            Dates.parse(date).format(DateTimeFormatter.ofPattern("MMMM yyyy")),
            style = MaterialTheme.typography.labelLarge, color = b.muted, modifier = Modifier.padding(start = 4.dp, bottom = 6.dp),
        )
        HorizontalPager(pager, Modifier.fillMaxWidth()) { page ->
            val ws = Dates.add(base, (page - center) * 7)
            Row(Modifier.fillMaxWidth()) {
                for (i in 0 until 7) {
                    val k = Dates.add(ws, i)
                    val sel = k == date
                    val isToday = k == today
                    Column(
                        Modifier.weight(1f).clip(CircleShape).clickable { onPick(k) }.padding(vertical = 4.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(Dates.dayLetter(k).take(1), fontSize = 12.sp, color = if (isToday) b.acc else b.muted, fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal)
                        Spacer(Modifier.height(4.dp))
                        Box(
                            Modifier.size(38.dp).clip(CircleShape)
                                .background(if (sel) b.acc else Color.Transparent)
                                .then(if (isToday && !sel) Modifier.border(1.5.dp, b.acc, CircleShape) else Modifier),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                Dates.parse(k).dayOfMonth.toString(), fontSize = 15.sp,
                                color = if (sel) b.onAcc else if (k > today) b.muted else b.ink,
                                fontWeight = if (sel || isToday) FontWeight.SemiBold else FontWeight.Normal,
                            )
                        }
                        Spacer(Modifier.height(4.dp))
                        val f = done(k)
                        Box(Modifier.size(5.dp).clip(CircleShape).background(if (f == null || f == 0f) Color.Transparent else b.acc.copy(alpha = if (f >= 1f) 1f else 0.35f)))
                    }
                }
            }
        }
    }
}

private suspend fun undoable(snack: SnackbarHostState, msg: String, undo: suspend () -> Unit) {
    snack.currentSnackbarData?.dismiss()
    if (snack.showSnackbar(msg, "Undo", withDismissAction = true) == SnackbarResult.ActionPerformed) undo()
}

@Composable
fun HabitCard(d: HabitDay, date: String, nav: NavHostController, onAskDelete: () -> Unit) {
    val repo = bloomApp().repo
    val scope = rememberCoroutineScope()
    val h = d.habit
    val b = LocalBloom.current
    SwipeRow(
        // Asks "only this day" or "this and all next days" first.
        onDelete = onAskDelete,
        asksFirst = true,
        onDone = { scope.launch { repo.toggleHabit(h, date, d.count) } },
        doneLabel = if (d.done) "Not done" else "Done",
    ) {
        BloomCard(Modifier.clickable { nav.navigate("habit/${h.id}") }, padding = 12.dp) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                ToneIcon(h.icon, h.color)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        h.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis,
                        textDecoration = if (d.done) TextDecoration.LineThrough else null, color = if (d.done) b.muted else b.ink,
                    )
                    val sub = listOfNotNull(
                        Dates.timeRange(h.startTime, h.endTime).ifEmpty { null }?.let { if (h.alarm) "⏰ $it" else it },
                        if (h.repeat == "weekly") "${d.weekDone}/${h.timesPerWeek} this week" else null,
                        if (h.goal > 1) "${d.count}/${h.goal} ${h.unit}".trim() else null,
                    ).joinToString(" · ")
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (sub.isNotEmpty()) Muted(sub, Modifier.weight(1f, fill = false))
                        if (d.streak > 0) {
                            Spacer(Modifier.width(6.dp))
                            Icon(Icons.Rounded.LocalFireDepartment, null, tint = b.toneFg("peach"), modifier = Modifier.size(15.dp))
                            Text("${d.streak}", fontSize = 12.sp, color = b.muted)
                        }
                    }
                }
                if (h.goal > 1) {
                    FilledTonalIconButton(onClick = { scope.launch { repo.addCount(h, date, -1) } }, enabled = d.count > 0, modifier = Modifier.size(36.dp)) { Icon(Icons.Rounded.Remove, "One less", Modifier.size(18.dp)) }
                    Spacer(Modifier.width(4.dp))
                    FilledTonalIconButton(onClick = { scope.launch { repo.addCount(h, date, 1) } }, modifier = Modifier.size(36.dp)) { Icon(Icons.Rounded.Add, "One more", Modifier.size(18.dp)) }
                } else {
                    CheckCircle(d.done, if (d.done) "Mark not done" else "Mark done") { scope.launch { repo.toggleHabit(h, date, d.count) } }
                }
            }
        }
    }
}

@Composable
private fun TodoCard(it: TodoItem, date: String, nav: NavHostController, snack: SnackbarHostState) {
    val app = bloomApp()
    val repo = app.repo
    val scope = rememberCoroutineScope()
    val t = it.t
    val b = LocalBloom.current
    val repeating = TodoLogic.repeats(t)
    SwipeRow(
        onDelete = {
            app.scope.launch {
                // A repeating to-do is only removed from this day.
                repo.deleteTodo(t, date, onlyThisDay = true)
                undoable(snack, if (repeating) "Removed “${t.title}” from this day" else "Deleted “${t.title}”") { repo.restoreTodo(t) }
            }
        },
        onDone = { scope.launch { repo.toggleTodo(t, date) } },
        doneLabel = if (it.done) "Not done" else "Done",
        deleteLabel = if (repeating) "Skip this day" else "Delete",
    ) {
        BloomCard(Modifier.clickable { nav.navigate("todo/${t.id}/$date") }, padding = 6.dp) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = it.done, onCheckedChange = { scope.launch { repo.toggleTodo(t, date) } })
                Column(Modifier.weight(1f).padding(end = 10.dp)) {
                    Text(t.title, maxLines = 2, overflow = TextOverflow.Ellipsis, textDecoration = if (it.done) TextDecoration.LineThrough else null, color = if (it.done) b.muted else b.ink)
                    val sub = listOfNotNull(
                        Dates.timeRange(t.startTime, t.endTime).ifEmpty { null },
                        when (t.repeat) { "daily" -> "Every day"; "days" -> HabitLogic.daysLabel(t.days); else -> null },
                    ).joinToString(" · ")
                    if (sub.isNotEmpty()) Muted(sub)
                }
                if (t.alarm && t.startTime.isNotEmpty() && !it.done) Icon(Icons.Rounded.Alarm, "Alarm on", tint = b.muted, modifier = Modifier.size(16.dp).padding(end = 2.dp))
                else if (t.reminder && t.startTime.isNotEmpty() && !it.done) Icon(Icons.Rounded.Notifications, "Reminder on", tint = b.muted, modifier = Modifier.size(16.dp).padding(end = 2.dp))
                Spacer(Modifier.width(8.dp))
            }
        }
    }
}
