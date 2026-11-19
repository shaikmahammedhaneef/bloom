@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)

package app.bloom.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import app.bloom.data.Catalog
import app.bloom.data.Dates
import app.bloom.data.Journal
import app.bloom.data.Mood
import app.bloom.data.bestByDate
import app.bloom.ui.components.BarChart
import app.bloom.ui.components.BloomCard
import app.bloom.ui.components.Muted
import app.bloom.ui.components.Pill
import app.bloom.ui.components.Screen
import app.bloom.ui.components.SectionTitle
import app.bloom.ui.components.iconFor
import app.bloom.ui.theme.LocalBloom
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.launch

@Composable
fun MoodScreen(nav: NavHostController) {
    val repo = bloomApp().repo
    val today = rememberToday()
    val scope = rememberCoroutineScope()
    val todays by remember(today) { repo.moodsOn(today) }.collectAsStateWithLifecycle(emptyList())
    val recent by remember(today) { repo.moodsSince(Dates.add(today, -13)) }.collectAsStateWithLifecycle(emptyList())
    // The check-in being written, or edited.
    var draft by remember { mutableStateOf<Mood?>(null) }

    Screen(
        title = "Mood",
        actions = {
            IconButton(onClick = { nav.navigate("journal") }) { Icon(Icons.AutoMirrored.Rounded.MenuBook, "Journal") }
            IconButton(onClick = { nav.navigate("moodHistory") }) { Icon(Icons.Rounded.CalendarMonth, "Mood calendar") }
        },
    ) {
        item {
            BloomCard {
                Text(if (draft?.id ?: 0L != 0L) "Edit check-in" else "How are you feeling?", style = MaterialTheme.typography.titleMedium)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    for (level in 1..5) {
                        val sel = draft?.level == level
                        Column(
                            Modifier.clip(RoundedCornerShape(14.dp)).background(if (sel) LocalBloom.current.accSoft else LocalBloom.current.surf)
                                .clickable { draft = (draft ?: Mood(date = today, time = Dates.nowTime(), level = level)).copy(level = level) }.padding(6.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(Catalog.MOOD_EMOJI[level - 1], fontSize = 32.sp)
                            Text(Catalog.MOOD_NAMES[level - 1], fontSize = 12.sp)
                        }
                    }
                }
                val d = draft
                if (d != null) {
                    Muted("What are you feeling?")
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        for (e in Catalog.EMOTIONS) FilterChip(e in d.emotions, { draft = d.copy(emotions = if (e in d.emotions) d.emotions - e else d.emotions + e) }, { Text(e) })
                    }
                    Muted("What's affecting it?")
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        for ((t, icon) in Catalog.TRIGGERS) FilterChip(
                            t in d.triggers, { draft = d.copy(triggers = if (t in d.triggers) d.triggers - t else d.triggers + t) }, { Text(t) },
                            leadingIcon = { Icon(iconFor(icon), null, Modifier.size(16.dp)) },
                        )
                    }
                    OutlinedTextField(d.note, { draft = d.copy(note = it.take(2000)) }, Modifier.fillMaxWidth(), label = { Text("Note (optional)") }, minLines = 2)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { scope.launch { repo.saveMood(d); draft = null } }) { Text("Save check-in") }
                        TextButton(onClick = { draft = null }) { Text("Cancel") }
                    }
                }
            }
        }
        if (todays.isNotEmpty()) {
            item { SectionTitle("Today") }
            items(todays, key = { it.id }) { m -> MoodRow(m, onEdit = { draft = m }, onDelete = { scope.launch { repo.deleteMood(m) } }) }
        }
        item {
            BloomCard {
                Text("Last 14 days", style = MaterialTheme.typography.titleMedium)
                val best = bestByDate(recent)
                val keys = (13 downTo 0).map { Dates.add(today, -it) }
                BarChart(keys.map { best[it]?.level?.toFloat() }, keys.map { Dates.dayLetter(it).take(1) }, 5f)
            }
        }
        item {
            BloomCard(Modifier.clickable { nav.navigate("journal") }) {
                Text("Journal", style = MaterialTheme.typography.titleMedium)
                Muted(Catalog.promptFor(today))
            }
        }
    }
}

@Composable
private fun MoodRow(m: Mood, onEdit: (() -> Unit)?, onDelete: () -> Unit) {
    BloomCard(if (onEdit != null) Modifier.clickable { onEdit() } else Modifier, padding = 12.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(Catalog.MOOD_EMOJI[m.level - 1], fontSize = 28.sp)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text("${Catalog.MOOD_NAMES[m.level - 1]}${if (m.time.isNotEmpty()) " · ${Dates.fmtTime(m.time)}" else ""}", fontWeight = FontWeight.Medium)
                val tags = m.emotions + m.triggers
                if (tags.isNotEmpty()) Muted(tags.joinToString(", "))
                if (m.note.isNotBlank()) Text(m.note, style = MaterialTheme.typography.bodyMedium)
            }
            IconButton(onClick = onDelete) { Icon(Icons.Rounded.Delete, "Delete check-in") }
        }
    }
}

@Composable
fun MoodHistoryScreen(nav: NavHostController) {
    val repo = bloomApp().repo
    val scope = rememberCoroutineScope()
    var month by remember { mutableStateOf(YearMonth.now()) }
    val from = month.atDay(1).toString()
    val to = month.atEndOfMonth().toString()
    val all by remember(from) { repo.moodsSince(from) }.collectAsStateWithLifecycle(emptyList())
    val moods = all.filter { it.date <= to }
    val best = bestByDate(moods)
    val b = LocalBloom.current
    var picked by remember { mutableStateOf<String?>(null) }

    Screen(title = "Mood calendar", onBack = { nav.popBackStack() }) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { month = month.minusMonths(1); picked = null }) { Icon(Icons.AutoMirrored.Rounded.KeyboardArrowLeft, "Previous month") }
                Text(month.format(DateTimeFormatter.ofPattern("MMMM yyyy")), Modifier.weight(1f), textAlign = TextAlign.Center, style = MaterialTheme.typography.titleMedium)
                IconButton(onClick = { month = month.plusMonths(1); picked = null }) { Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, "Next month") }
            }
        }
        item {
            BloomCard(padding = 10.dp) {
                Row { for (d in listOf("M", "T", "W", "T", "F", "S", "S")) Text(d, Modifier.weight(1f), textAlign = TextAlign.Center, color = b.muted, fontSize = 12.sp) }
                val lead = (month.atDay(1).dayOfWeek.value + 6) % 7
                val cells = List(lead) { null } + (1..month.lengthOfMonth()).map { month.atDay(it).toString() }
                for (week in cells.chunked(7)) {
                    Row {
                        for (i in 0 until 7) {
                            val k = week.getOrNull(i)
                            Box(
                                Modifier.weight(1f).aspectRatio(1f).padding(2.dp).clip(RoundedCornerShape(10.dp))
                                    .background(if (k != null && k == picked) b.accSoft else b.surf)
                                    .clickable(enabled = k != null) { picked = k },
                                contentAlignment = Alignment.Center,
                            ) {
                                if (k != null) {
                                    val m = best[k]
                                    if (m != null) Text(Catalog.MOOD_EMOJI[m.level - 1], fontSize = 20.sp)
                                    else Text(Dates.parse(k).dayOfMonth.toString(), color = b.muted, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
        item {
            val levels = best.values.map { it.level }
            val emotions = moods.flatMap { it.emotions }.groupingBy { it }.eachCount().entries.sortedByDescending { it.value }.take(3)
            BloomCard {
                Text("This month", style = MaterialTheme.typography.titleMedium)
                Muted(if (levels.isEmpty()) "No check-ins yet." else "Average mood: ${Catalog.MOOD_NAMES[Math.round(levels.average()).toInt() - 1]} · ${best.size} days checked in")
                if (emotions.isNotEmpty()) FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) { emotions.forEach { Pill("${it.key} ×${it.value}") } }
            }
        }
        val shown = moods.filter { picked == null || it.date == picked }.sortedWith(compareByDescending<Mood> { it.date }.thenByDescending { it.time })
        if (shown.isNotEmpty()) item { SectionTitle(picked?.let { Dates.fmtDay(it) } ?: "All check-ins") }
        items(shown, key = { it.id }) { m ->
            Column {
                if (picked == null) Muted(Dates.fmtDay(m.date))
                MoodRow(m, null) { scope.launch { repo.deleteMood(m) } }
            }
        }
    }
}

@Composable
fun JournalScreen(nav: NavHostController) {
    val repo = bloomApp().repo
    val today = rememberToday()
    val scope = rememberCoroutineScope()
    var date by remember(today) { mutableStateOf(today) }
    val entry by remember(date) { repo.journalOn(date) }.collectAsStateWithLifecycle(null)
    val recent by repo.journalRecent().collectAsStateWithLifecycle(emptyList())
    var offset by remember { mutableIntStateOf(0) }
    var text by remember(date) { mutableStateOf("") }
    var good by remember(date) { mutableStateOf(listOf("", "", "")) }
    var prompt by remember(date) { mutableStateOf("") }
    var saved by remember { mutableStateOf(false) }
    LaunchedEffect(entry, date) {
        val e = entry
        text = e?.text ?: ""
        good = (e?.gratitude ?: emptyList()).let { g -> List(3) { g.getOrElse(it) { "" } } }
        prompt = e?.prompt?.ifEmpty { null } ?: Catalog.promptFor(date, offset)
    }

    Screen(title = "Journal", subtitle = Dates.fmtLong(date), onBack = { nav.popBackStack() }) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { date = Dates.add(date, -1) }) { Icon(Icons.AutoMirrored.Rounded.KeyboardArrowLeft, "Previous day") }
                Text(if (date == today) "Today" else Dates.fmtDay(date), Modifier.weight(1f), textAlign = TextAlign.Center)
                IconButton(onClick = { date = Dates.add(date, 1) }, enabled = date < today) { Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, "Next day") }
            }
        }
        item {
            BloomCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(prompt, Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                    IconButton(onClick = { offset++; prompt = Catalog.promptFor(date, offset) }) { Icon(Icons.Rounded.Refresh, "Another prompt") }
                }
                OutlinedTextField(text, { text = it.take(10000); saved = false }, Modifier.fillMaxWidth(), minLines = 5, placeholder = { Text("Write freely…") })
                Text("Three good things", fontWeight = FontWeight.Medium)
                good.forEachIndexed { i, g ->
                    OutlinedTextField(g, { v -> good = good.toMutableList().also { it[i] = v.take(200) }; saved = false }, Modifier.fillMaxWidth(), singleLine = true, label = { Text("${i + 1}.") })
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(onClick = {
                        scope.launch { repo.saveJournal(Journal(date, prompt, text.trim(), good.map { it.trim() })); saved = true }
                    }, enabled = text.isNotBlank() || good.any { it.isNotBlank() }) { Text("Save") }
                    if (saved) Muted("Saved")
                }
            }
        }
        val past = recent.filter { it.date != date }
        if (past.isNotEmpty()) item { SectionTitle("Earlier entries") }
        items(past, key = { it.date }) { j ->
            BloomCard(Modifier.clickable { date = j.date }, padding = 12.dp) {
                Text(Dates.fmtDay(j.date), fontWeight = FontWeight.Medium)
                if (j.text.isNotBlank()) Muted(j.text.take(140) + if (j.text.length > 140) "…" else "")
                val g = j.gratitude.filter { it.isNotBlank() }
                if (g.isNotEmpty()) Muted("Good things: " + g.joinToString(" · "))
            }
        }
    }
}
