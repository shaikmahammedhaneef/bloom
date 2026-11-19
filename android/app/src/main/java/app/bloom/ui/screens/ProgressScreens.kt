@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)

package app.bloom.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import app.bloom.data.Catalog
import app.bloom.data.Dates
import app.bloom.data.Repository
import app.bloom.ui.components.BarChart
import app.bloom.ui.components.BloomCard
import app.bloom.ui.components.ChoiceChips
import app.bloom.ui.components.ConfirmDialog
import app.bloom.ui.components.Muted
import app.bloom.ui.components.Pill
import app.bloom.ui.components.Screen
import app.bloom.ui.components.SectionTitle
import app.bloom.ui.components.StatTile
import app.bloom.ui.components.ToneIcon
import app.bloom.ui.theme.LocalBloom
import kotlinx.coroutines.launch

@Composable
fun ProgressScreen(nav: NavHostController) {
    val repo = bloomApp().repo
    val today = rememberToday()
    var month by remember { mutableStateOf(false) }
    var stats by remember { mutableStateOf<Repository.Stats?>(null) }
    // Recompute when anything that feeds the numbers changes.
    val logs by remember(today) { repo.logsFlow(today) }.collectAsStateWithLifecycle(emptyList())
    val moods by remember(today) { repo.moodsSince(Dates.add(today, -400)) }.collectAsStateWithLifecycle(emptyList())
    val sessions by repo.sessionsFlow().collectAsStateWithLifecycle(emptyList())
    LaunchedEffect(today, month, logs, moods, sessions) { stats = repo.stats(today, month) }
    val b = LocalBloom.current

    Screen(
        title = "Progress",
        actions = { IconButton(onClick = { nav.navigate("challenges") }) { Icon(Icons.Rounded.EmojiEvents, "Challenges") } },
    ) {
        val s = stats ?: return@Screen
        item {
            BloomCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Level ${s.level.level} · ${s.level.name}", style = MaterialTheme.typography.titleLarge)
                        Muted("${s.points} points · ${s.level.next - s.points} to ${s.level.nextName}")
                    }
                    Text("🌱")
                }
                LinearProgressIndicator({ ((s.points - s.level.start).toFloat() / (s.level.next - s.level.start)).coerceIn(0f, 1f) }, Modifier.fillMaxWidth())
            }
        }
        item { ChoiceChips(listOf(false to "This week", true to "This month"), { it == month }) { month = it } }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile(s.avgCompletion?.let { "$it%" } ?: "—", "Avg. completion", Modifier.weight(1f))
                StatTile("${s.habitsDone}", "Habits done", Modifier.weight(1f))
                StatTile(s.avgMood?.let { "%.1f".format(it) } ?: "—", "Avg. mood", Modifier.weight(1f))
            }
        }
        item {
            BloomCard {
                Text("Daily completion", style = MaterialTheme.typography.titleMedium)
                BarChart(s.days.map { it.second?.toFloat() }, if (month) emptyList() else s.days.map { Dates.dayLetter(it.first).take(2) }, 100f)
                if (month) Muted("${Dates.fmtShort(s.from)} – ${Dates.fmtShort(s.to)}")
            }
        }
        if (s.moodSeries.isNotEmpty()) item {
            BloomCard {
                Text("Mood", style = MaterialTheme.typography.titleMedium)
                val by = s.moodSeries.toMap()
                BarChart(s.days.map { by[it.first]?.toFloat() }, if (month) emptyList() else s.days.map { Dates.dayLetter(it.first).take(2) }, 5f, b.toneFg("lilac"))
            }
        }
        item {
            BloomCard {
                Text("Insights", style = MaterialTheme.typography.titleMedium)
                if (s.insights.isEmpty()) Muted("Keep checking in. After a couple of weeks Bloom shows which habits line up with better moods.")
                s.insights.forEach { Text("• $it") }
            }
        }
        item { SectionTitle("Badges") }
        item {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp), maxItemsInEachRow = 2) {
                for (badge in s.badges) {
                    BloomCard(Modifier.weight(1f).alpha(if (badge.earned) 1f else 0.45f), padding = 12.dp) {
                        ToneIcon(badge.icon, if (badge.earned) "honey" else "sage", 36.dp)
                        Text(badge.name, fontWeight = FontWeight.Medium)
                        Muted(badge.desc)
                    }
                }
            }
        }
        item {
            BloomCard {
                Text("How you earn points", style = MaterialTheme.typography.titleMedium)
                for ((label, count, each) in s.breakdown) Row { Text(label, Modifier.weight(1f)); Muted("$count × $each = ${count * each}") }
            }
        }
    }
}

@Composable
fun ChallengesScreen(nav: NavHostController) {
    val repo = bloomApp().repo
    val today = rememberToday()
    val scope = rememberCoroutineScope()
    LaunchedEffect(today) { repo.refreshChallenges(today) }
    val mine by repo.challengesFlow().collectAsStateWithLifecycle(emptyList())
    var leaving by remember { mutableStateOf<app.bloom.data.UserChallenge?>(null) }
    leaving?.let { c ->
        ConfirmDialog("Leave this challenge?", "Your progress in it is removed.", "Leave", { scope.launch { repo.leaveChallenge(c) } }) { leaving = null }
    }

    Screen(title = "Challenges", onBack = { nav.popBackStack() }) {
        if (mine.isNotEmpty()) item { SectionTitle("Yours") }
        items(mine, key = { it.id }) { c ->
            val def = Catalog.CHALLENGES.firstOrNull { it.key == c.key } ?: return@items
            val day = minOf(def.days, Dates.between(c.startDate, today) + 1)
            BloomCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ToneIcon(def.icon, def.tone)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(def.name, style = MaterialTheme.typography.titleMedium)
                        Muted(def.task)
                    }
                    when (c.status) {
                        "completed" -> Pill("Completed", "sage")
                        "ended" -> Pill("Ended", "honey")
                        else -> Pill("Day $day of ${def.days}")
                    }
                }
                LinearProgressIndicator({ c.doneDates.size.toFloat() / def.days }, Modifier.fillMaxWidth())
                Muted("${c.doneDates.size} of ${def.days} days done")
                if (c.status == "active") Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(today in c.doneDates, { scope.launch { repo.markChallenge(c, today, it) } })
                    Text("Done today", Modifier.weight(1f).clickable { scope.launch { repo.markChallenge(c, today, today !in c.doneDates) } })
                    TextButton(onClick = { leaving = c }) { Text("Leave") }
                }
            }
        }
        item { SectionTitle("Start one") }
        items(Catalog.CHALLENGES.filter { d -> mine.none { it.key == d.key && it.status == "active" } }, key = { "c-" + it.key }) { d ->
            BloomCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ToneIcon(d.icon, d.tone)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(d.name, style = MaterialTheme.typography.titleMedium)
                        Muted("${d.days} days · ${d.task}")
                    }
                    OutlinedButton(onClick = { scope.launch { repo.joinChallenge(d.key, today) } }) { Text("Start") }
                }
            }
        }
    }
}
