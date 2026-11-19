@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)

package app.bloom.ui.screens

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import app.bloom.data.Dates
import app.bloom.data.Habit
import app.bloom.data.QuickAdd
import app.bloom.data.Todo
import app.bloom.ui.components.Muted
import java.net.URLEncoder
import java.time.LocalDate
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * One box to add a to-do or a habit. Times, "tomorrow", "every day" and
 * "weekdays" typed in the text are picked up and shown as chips.
 */
@Composable
fun QuickAddSheet(nav: NavHostController, date: String, onDismiss: () -> Unit, onAdded: (String) -> Unit) {
    val repo = bloomApp().repo
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val today = Dates.today()
    val sheet = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var kind by remember { mutableStateOf("todo") }
    var text by remember { mutableStateOf("") }
    // A time picked with the chip wins over one typed in the text. "" = no time.
    var pickedTime by remember { mutableStateOf<String?>(null) }
    var day by remember { mutableStateOf(maxOf(date, today)) }
    var repeat by remember { mutableStateOf("daily") } // habits: daily, weekdays, weekends
    var remind by remember { mutableStateOf(true) }
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) { delay(200); runCatching { focus.requestFocus() } }

    val p = QuickAdd.parse(text)
    val time = pickedTime ?: p.time ?: ""
    val dayKey = if (p.tomorrow) Dates.add(today, 1) else day
    val habitRepeat = when { p.weekdays -> "weekdays"; p.daily -> "daily"; else -> repeat }

    fun submit() {
        if (p.title.isBlank()) return
        scope.launch {
            if (kind == "todo") {
                repo.addTodo(
                    Todo(
                        title = p.title, date = dayKey, startTime = time, reminder = remind && time.isNotEmpty(),
                        repeat = if (p.weekdays) "days" else if (p.daily) "daily" else "none",
                        days = if (p.weekdays) listOf(1, 2, 3, 4, 5) else emptyList(),
                    ),
                )
                onAdded("Added to-do “${p.title}”")
            } else {
                val (icon, color) = QuickAdd.guessIcon(p.title)
                repo.saveHabit(
                    Habit(
                        name = p.title, icon = icon, color = color, startTime = time, reminder = remind && time.isNotEmpty(),
                        repeat = if (habitRepeat == "daily") "daily" else "days",
                        days = when (habitRepeat) { "weekdays" -> listOf(1, 2, 3, 4, 5); "weekends" -> listOf(0, 6); else -> emptyList() },
                    ),
                )
                onAdded("Added habit “${p.title}”")
            }
            sheet.hide()
            onDismiss()
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheet) {
        Column(Modifier.padding(start = 20.dp, end = 20.dp, bottom = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                listOf("todo" to "To-do", "habit" to "Habit").forEachIndexed { i, (k, label) ->
                    SegmentedButton(kind == k, { kind = k }, SegmentedButtonDefaults.itemShape(i, 2)) { Text(label) }
                }
            }
            OutlinedTextField(
                text, { text = it.take(140) }, Modifier.fillMaxWidth().focusRequester(focus),
                placeholder = { Text(if (kind == "todo") "e.g. Call mom at 6pm tomorrow" else "e.g. Drink water every day 9am") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences, imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { submit() }),
            )
            if (kind == "habit") Muted("A habit repeats and builds a streak. A to-do is something to get done.")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                FilterChip(
                    time.isNotEmpty(),
                    {
                        val (h, m) = if (time.isNotEmpty()) time.split(":").map { it.toInt() } else listOf(9, 0)
                        TimePickerDialog(ctx, { _, hh, mm -> pickedTime = "%02d:%02d".format(hh, mm) }, h, m, false).show()
                    },
                    { Text(if (time.isEmpty()) "Time" else Dates.fmtTime(time)) },
                    leadingIcon = { Icon(Icons.Rounded.Schedule, null, Modifier.size(18.dp)) },
                    trailingIcon = if (time.isNotEmpty()) ({ Icon(Icons.Rounded.Close, "Remove time", Modifier.size(18.dp).clickable { pickedTime = "" }) }) else null,
                )
                if (time.isNotEmpty()) FilterChip(remind, { remind = !remind }, { Text("Remind me") }, leadingIcon = { Icon(Icons.Rounded.Notifications, null, Modifier.size(18.dp)) })
                if (kind == "todo") {
                    FilterChip(dayKey == today, { day = today }, { Text("Today") }, enabled = !p.tomorrow)
                    FilterChip(dayKey == Dates.add(today, 1), { day = Dates.add(today, 1) }, { Text("Tomorrow") })
                    val other = dayKey != today && dayKey != Dates.add(today, 1)
                    FilterChip(
                        other,
                        {
                            val d = LocalDate.parse(dayKey)
                            DatePickerDialog(ctx, { _, y, mo, da -> day = LocalDate.of(y, mo + 1, da).toString() }, d.year, d.monthValue - 1, d.dayOfMonth).show()
                        },
                        { Text(if (other) Dates.fmtDay(dayKey) else "Pick a day") },
                        leadingIcon = { Icon(Icons.Rounded.CalendarMonth, null, Modifier.size(18.dp)) },
                        enabled = !p.tomorrow,
                    )
                    if (p.daily || p.weekdays) FilterChip(true, {}, { Text(if (p.weekdays) "Weekdays" else "Every day") })
                } else {
                    for ((k, label) in listOf("daily" to "Every day", "weekdays" to "Weekdays", "weekends" to "Weekends")) {
                        FilterChip(habitRepeat == k, { repeat = k }, { Text(label) }, enabled = !(p.daily || p.weekdays) || habitRepeat == k)
                    }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = {
                    val t = URLEncoder.encode(p.title, "UTF-8")
                    onDismiss()
                    nav.navigate(if (kind == "todo") "todo/0/$dayKey?title=$t" else "habitForm/0?title=$t")
                }) { Text("More options") }
                Spacer(Modifier.weight(1f))
                Button(onClick = { submit() }, enabled = p.title.isNotBlank()) { Text("Add") }
            }
        }
    }
}
