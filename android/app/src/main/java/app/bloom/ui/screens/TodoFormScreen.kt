@file:OptIn(ExperimentalMaterial3Api::class)

package app.bloom.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
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
import androidx.compose.ui.text.font.FontWeight
import androidx.navigation.NavHostController
import app.bloom.data.Dates
import app.bloom.data.Todo
import app.bloom.data.TodoLogic
import app.bloom.ui.components.BloomCard
import app.bloom.ui.components.ChoiceChips
import app.bloom.ui.components.DateField
import app.bloom.ui.components.DaysPicker
import app.bloom.ui.components.Muted
import app.bloom.ui.components.Screen
import app.bloom.ui.components.SectionTitle
import app.bloom.ui.components.TimeField
import kotlinx.coroutines.launch

/** Adds or edits a to-do. `date` is the day it was opened from (the day being edited, for a repeating one). */
@Composable
fun TodoFormScreen(nav: NavHostController, id: Long, date: String, title: String = "") {
    val repo = bloomApp().repo
    val scope = rememberCoroutineScope()
    var orig by remember { mutableStateOf<Todo?>(null) }
    var t by remember { mutableStateOf<Todo?>(if (id == 0L) Todo(title = title, date = date, reminder = true) else null) }
    var error by remember { mutableStateOf<String?>(null) }
    // For a repeating to-do: ask "this day or all days?" before saving or deleting.
    var ask by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(id) { if (id != 0L) repo.dao.todo(id)?.let { orig = it; t = it } }
    val f = t ?: return
    val repeating = orig?.let { TodoLogic.repeats(it) } == true
    fun set(x: Todo) { t = x; error = null }

    fun save(onlyThisDay: Boolean) = scope.launch {
        if (id == 0L) repo.addTodo(f) else repo.updateTodo(orig!!, f, date, onlyThisDay)
        nav.popBackStack()
    }
    fun delete(onlyThisDay: Boolean) = scope.launch {
        repo.deleteTodo(orig!!, date, onlyThisDay)
        nav.popBackStack()
    }

    ask?.let { what ->
        AlertDialog(
            onDismissRequest = { ask = null },
            title = { Text(if (what == "save") "Change which days?" else "Delete which days?") },
            text = { Text("This to-do repeats. Change only ${Dates.fmtDay(date)}, or every day it's scheduled?") },
            confirmButton = { TextButton(onClick = { ask = null; if (what == "save") save(false) else delete(false) }) { Text("All days") } },
            dismissButton = { TextButton(onClick = { ask = null; if (what == "save") save(true) else delete(true) }) { Text("Only this day") } },
        )
    }

    Screen(
        title = if (id == 0L) "New to-do" else "Edit to-do", onBack = { nav.popBackStack() },
        actions = { if (id != 0L) IconButton(onClick = { if (repeating) ask = "delete" else delete(false) }) { Icon(Icons.Rounded.Delete, "Delete to-do") } },
    ) {
        item { OutlinedTextField(f.title, { set(f.copy(title = it.take(140))) }, Modifier.fillMaxWidth(), label = { Text("What do you need to do?") }) }
        if (!repeating || id == 0L) item { DateField(if (f.repeat == "none") "Day" else "Starts", f.date) { set(f.copy(date = it)) } }
        item {
            Row {
                TimeField("From", f.startTime, Modifier.weight(1f)) { set(f.copy(startTime = it, endTime = if (it.isEmpty()) "" else f.endTime)) }
                if (f.startTime.isNotEmpty()) TimeField("To", f.endTime, Modifier.weight(1f)) { set(f.copy(endTime = it)) }
            }
        }
        item {
            SectionTitle("Repeat")
            ChoiceChips(listOf("none" to "Once", "daily" to "Every day", "days" to "Some days"), { it == f.repeat }) {
                set(f.copy(repeat = it, days = if (it == "days" && f.days.isEmpty()) listOf(Dates.dow(f.date)) else f.days))
            }
            if (f.repeat == "days") DaysPicker(f.days) { set(f.copy(days = it)) }
            DateField(if (f.repeat == "none") "Runs over several days? Last day" else "Stops after (optional)", f.endDate, clearable = true) { set(f.copy(endDate = it)) }
        }
        item {
            BloomCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Remind me", fontWeight = FontWeight.Medium)
                        Muted(if (f.startTime.isEmpty()) "Set a 'from' time to get a reminder." else "A notification at ${Dates.fmtTime(f.startTime)}.")
                    }
                    Switch(f.reminder, { set(f.copy(reminder = it)) })
                }
            }
        }
        if (error != null) item { Text(error!!, color = MaterialTheme.colorScheme.error) }
        item {
            Button(onClick = {
                error = when {
                    f.title.isBlank() -> "Write what you need to do."
                    f.repeat == "days" && f.days.isEmpty() -> "Pick at least one day."
                    f.endDate.isNotEmpty() && f.endDate < f.date -> "The end date can't be before the start date."
                    else -> null
                }
                if (error == null) { if (repeating) ask = "save" else save(false) }
            }, Modifier.fillMaxWidth()) { Text(if (id == 0L) "Add to-do" else "Save") }
        }
    }
}
