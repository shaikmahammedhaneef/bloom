@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)

package app.bloom.ui.components

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.DirectionsWalk
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.Air
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Bedtime
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CleaningServices
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Cloud
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FitnessCenter
import androidx.compose.material.icons.rounded.GridView
import androidx.compose.material.icons.rounded.Hotel
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.MonitorHeart
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.People
import androidx.compose.material.icons.rounded.PhoneAndroid
import androidx.compose.material.icons.rounded.Restaurant
import androidx.compose.material.icons.rounded.SentimentSatisfied
import androidx.compose.material.icons.rounded.Spa
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.TrackChanges
import androidx.compose.material.icons.rounded.WaterDrop
import androidx.compose.material.icons.rounded.WbSunny
import androidx.compose.material.icons.rounded.Work
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.bloom.data.Dates
import app.bloom.ui.theme.LocalBloom
import java.time.LocalDate

/** The web app's icon names, mapped to Material icons. */
fun iconFor(name: String): ImageVector = when (name) {
    "drop" -> Icons.Rounded.WaterDrop
    "book" -> Icons.AutoMirrored.Rounded.MenuBook
    "leaf" -> Icons.Rounded.Spa
    "dumbbell" -> Icons.Rounded.FitnessCenter
    "moon" -> Icons.Rounded.Bedtime
    "sun" -> Icons.Rounded.WbSunny
    "pen" -> Icons.Rounded.Edit
    "broom" -> Icons.Rounded.CleaningServices
    "heart" -> Icons.Rounded.Favorite
    "target" -> Icons.Rounded.TrackChanges
    "wind" -> Icons.Rounded.Air
    "food" -> Icons.Rounded.Restaurant
    "steps" -> Icons.AutoMirrored.Rounded.DirectionsWalk
    "bed" -> Icons.Rounded.Hotel
    "phone" -> Icons.Rounded.PhoneAndroid
    "work" -> Icons.Rounded.Work
    "music" -> Icons.Rounded.MusicNote
    "sparkle" -> Icons.Rounded.AutoAwesome
    "bolt" -> Icons.Rounded.Bolt
    "people" -> Icons.Rounded.People
    "cloud" -> Icons.Rounded.Cloud
    "pulse" -> Icons.Rounded.MonitorHeart
    "flame" -> Icons.Rounded.LocalFireDepartment
    "smile" -> Icons.Rounded.SentimentSatisfied
    "star" -> Icons.Rounded.Star
    "grid" -> Icons.Rounded.GridView
    "trophy" -> Icons.Rounded.EmojiEvents
    else -> Icons.Rounded.Check
}

/** A screen with a top bar and a scrolling list. */
@Composable
fun Screen(
    title: String,
    subtitle: String? = null,
    onBack: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
    fab: @Composable () -> Unit = {},
    snackbar: SnackbarHostState? = null,
    content: LazyListScope.() -> Unit,
) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(title, style = if (onBack == null) MaterialTheme.typography.headlineSmall else MaterialTheme.typography.titleLarge)
                        if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = { if (onBack != null) IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Back") } },
                actions = actions,
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
        floatingActionButton = fab,
        snackbarHost = { if (snackbar != null) SnackbarHost(snackbar) },
    ) { pad ->
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = pad.calculateTopPadding() + 4.dp, bottom = pad.calculateBottomPadding() + 96.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            content = content,
        )
    }
}

@Composable
fun BloomCard(modifier: Modifier = Modifier, padding: Dp = 16.dp, content: @Composable ColumnScope.() -> Unit) {
    val b = LocalBloom.current
    Card(
        modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = b.surf, contentColor = b.ink),
        border = if (b.dark) null else androidx.compose.foundation.BorderStroke(1.dp, b.line),
    ) { Column(Modifier.padding(padding), verticalArrangement = Arrangement.spacedBy(10.dp), content = content) }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(text, modifier.padding(top = 8.dp), style = MaterialTheme.typography.titleMedium)
}

@Composable
fun Muted(text: String, modifier: Modifier = Modifier, textAlign: TextAlign? = null) {
    Text(text, modifier, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium, textAlign = textAlign)
}

/** A rounded colored square with an icon, like the web app's tone tiles. */
@Composable
fun ToneIcon(icon: String, tone: String, size: Dp = 40.dp) {
    val b = LocalBloom.current
    Box(Modifier.size(size).clip(RoundedCornerShape(size / 3.2f)).background(b.toneBg(tone)), contentAlignment = Alignment.Center) {
        Icon(iconFor(icon), null, tint = b.toneFg(tone), modifier = Modifier.size(size * 0.55f))
    }
}

/** A tappable field that opens the system time picker. */
@Composable
fun TimeField(label: String, value: String, modifier: Modifier = Modifier, clearable: Boolean = true, onChange: (String) -> Unit) {
    val ctx = LocalContext.current
    Column(modifier) {
        Muted(label)
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedButton(onClick = {
                val (h, m) = if (value.isNotEmpty()) value.split(":").map { it.toInt() } else listOf(8, 0)
                TimePickerDialog(ctx, { _, hh, mm -> onChange("%02d:%02d".format(hh, mm)) }, h, m, false).show()
            }) { Text(if (value.isEmpty()) "Set time" else Dates.fmtTime(value)) }
            if (clearable && value.isNotEmpty()) IconButton(onClick = { onChange("") }) { Icon(Icons.Rounded.Close, "Clear $label") }
        }
    }
}

@Composable
fun DateField(label: String, value: String, modifier: Modifier = Modifier, clearable: Boolean = false, onChange: (String) -> Unit) {
    val ctx = LocalContext.current
    Column(modifier) {
        Muted(label)
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedButton(onClick = {
                val d = if (value.isNotEmpty()) LocalDate.parse(value) else LocalDate.now()
                DatePickerDialog(ctx, { _, y, mo, da -> onChange(LocalDate.of(y, mo + 1, da).toString()) }, d.year, d.monthValue - 1, d.dayOfMonth).show()
            }) { Text(if (value.isEmpty()) "Pick a date" else Dates.fmtDay(value)) }
            if (clearable && value.isNotEmpty()) IconButton(onClick = { onChange("") }) { Icon(Icons.Rounded.Close, "Clear $label") }
        }
    }
}

/** Mon … Sun toggles. Values are 0 = Sunday … 6 = Saturday. */
@Composable
fun DaysPicker(days: List<Int>, onChange: (List<Int>) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        for (d in listOf(1, 2, 3, 4, 5, 6, 0)) {
            FilterChip(selected = d in days, onClick = { onChange(if (d in days) days - d else (days + d).sorted()) }, label = { Text(Dates.WEEKDAYS[d]) })
        }
    }
}

@Composable
fun <T> ChoiceChips(options: List<Pair<T, String>>, selected: (T) -> Boolean, onClick: (T) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        for ((v, label) in options) FilterChip(selected = selected(v), onClick = { onClick(v) }, label = { Text(label) })
    }
}

/** A ring that fills to `pct` (0–100), with text in the middle. */
@Composable
fun ProgressRing(pct: Int, size: Dp = 72.dp, center: @Composable () -> Unit) {
    val b = LocalBloom.current
    Box(Modifier.size(size), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val w = 8.dp.toPx()
            drawArc(b.line, 0f, 360f, false, style = Stroke(w), topLeft = Offset(w / 2, w / 2), size = Size(this.size.width - w, this.size.height - w))
            drawArc(b.acc, -90f, 3.6f * pct.coerceIn(0, 100), false, style = Stroke(w, cap = StrokeCap.Round), topLeft = Offset(w / 2, w / 2), size = Size(this.size.width - w, this.size.height - w))
        }
        center()
    }
}

/** Simple vertical bars. Null values show as an empty slot. */
@Composable
fun BarChart(values: List<Float?>, labels: List<String>, max: Float, color: Color = LocalBloom.current.acc, height: Dp = 120.dp, goal: Float? = null) {
    val b = LocalBloom.current
    Column {
        Canvas(Modifier.fillMaxWidth().height(height)) {
            val n = values.size.coerceAtLeast(1)
            val slot = size.width / n
            val bw = (slot * 0.62f).coerceAtMost(28.dp.toPx())
            if (goal != null && max > 0) {
                val y = size.height * (1 - goal / max)
                drawLine(b.muted.copy(alpha = 0.6f), Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
            }
            values.forEachIndexed { i, v ->
                val x = i * slot + (slot - bw) / 2
                drawRoundRect(b.line.copy(alpha = 0.5f), Offset(x, 0f), Size(bw, size.height), CornerRadius(6.dp.toPx()))
                if (v != null && v > 0 && max > 0) {
                    val h = size.height * (v / max).coerceIn(0f, 1f)
                    drawRoundRect(color, Offset(x, size.height - h), Size(bw, h), CornerRadius(6.dp.toPx()))
                }
            }
        }
        if (labels.isNotEmpty()) Row(Modifier.fillMaxWidth()) {
            labels.forEach { Text(it, Modifier.weight(1f), fontSize = 11.sp, textAlign = TextAlign.Center, color = b.muted, maxLines = 1) }
        }
    }
}

@Composable
fun StatTile(value: String, label: String, modifier: Modifier = Modifier) {
    BloomCard(modifier, padding = 12.dp) {
        Text(value, style = MaterialTheme.typography.titleLarge)
        Muted(label)
    }
}

@Composable
fun ConfirmDialog(title: String, text: String, confirm: String, onConfirm: () -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { Text(text) },
        confirmButton = { TextButton(onClick = { onConfirm(); onDismiss() }) { Text(confirm, color = MaterialTheme.colorScheme.error) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

/** The round check button used for habits and to-dos. */
@Composable
fun CheckCircle(done: Boolean, label: String, onClick: () -> Unit) {
    val b = LocalBloom.current
    IconButton(onClick = onClick) {
        Box(
            Modifier.size(30.dp).clip(CircleShape).background(if (done) b.acc else Color.Transparent)
                .then(if (done) Modifier else Modifier.background(b.line.copy(alpha = 0.6f), CircleShape)),
            contentAlignment = Alignment.Center,
        ) {
            if (done) Icon(Icons.Rounded.Check, label, tint = b.onAcc, modifier = Modifier.size(20.dp))
            else Box(Modifier.size(26.dp).clip(CircleShape).background(b.surf))
        }
    }
}

@Composable
fun Pill(text: String, tone: String? = null) {
    val b = LocalBloom.current
    Text(
        text,
        Modifier.clip(RoundedCornerShape(50)).background(if (tone != null) b.toneBg(tone) else b.accSoft).padding(horizontal = 10.dp, vertical = 3.dp),
        color = if (tone != null) b.toneFg(tone) else b.accInk, fontSize = 12.sp, fontWeight = FontWeight.Medium,
    )
}

@Composable
fun rememberSnackbar() = remember { SnackbarHostState() }
