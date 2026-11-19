package app.bloom.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.bloom.data.Dates
import app.bloom.data.Habit
import app.bloom.data.HabitLogic
import app.bloom.data.Repository
import app.bloom.ui.components.Muted
import app.bloom.ui.theme.LocalBloom
import kotlinx.coroutines.launch

/**
 * Asks how much of a habit to delete, starting from `date`:
 * only that day, or that day and every day after it. Days before `date`
 * always keep their check-offs, streaks and points.
 * `allowFull` also offers deleting it with all its history.
 */
@Composable
fun HabitDeleteDialog(h: Habit, date: String, snack: SnackbarHostState, allowFull: Boolean = false, onDismiss: () -> Unit, onDeleted: () -> Unit = {}) {
    val app = bloomApp()
    val repo = app.repo
    val b = LocalBloom.current
    val today = Dates.today()
    val dayName = when (date) { today -> "today"; Dates.add(today, 1) -> "tomorrow"; else -> Dates.fmtDay(date) }
    val stopped = HabitLogic.ended(h, today)
    val noPast = date <= h.startDate.ifEmpty { date }

    fun run(work: suspend () -> Repository.HabitUndo, message: String) {
        onDismiss()
        onDeleted()
        app.scope.launch {
            val undo = work()
            snack.currentSnackbarData?.dismiss()
            if (snack.showSnackbar(message, "Undo", withDismissAction = true) == SnackbarResult.ActionPerformed) repo.undoHabit(undo)
        }
    }

    @Composable
    fun Option(title: String, sub: String, danger: Boolean = false, onClick: () -> Unit) {
        Surface(
            Modifier.fillMaxWidth().clickable(onClick = onClick), shape = RoundedCornerShape(14.dp),
            color = if (danger) b.danger.copy(alpha = 0.08f) else b.accSoft.copy(alpha = 0.6f),
        ) {
            Column(Modifier.padding(14.dp)) {
                Text(title, fontWeight = FontWeight.SemiBold, color = if (danger) b.danger else b.ink)
                Muted(sub)
            }
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delete “${h.name}”?") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (!stopped && HabitLogic.isScheduled(h, date)) {
                    Option("Only $dayName", "Skip just this day. Every other day stays as it is.") {
                        run({ repo.skipHabitDay(h, date) }, "“${h.name}” removed from $dayName")
                    }
                }
                if (!stopped) {
                    Option(
                        "This and all next days",
                        if (noPast) "It starts on this day, so there's no history to keep. It's deleted." else "Stops it from $dayName on. Earlier days keep their check-offs, streaks and points.",
                    ) { run({ repo.endHabitFrom(h, date) }, if (noPast) "Deleted “${h.name}”" else "“${h.name}” stopped from $dayName. History kept.") }
                }
                if (allowFull || stopped) {
                    Option("Delete completely", "Also removes every past check-off. Your streaks and points for it go too.", danger = true) {
                        run({ repo.deleteHabitCompletely(h) }, "Deleted “${h.name}” and its history")
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
        titleContentColor = b.ink,
        textContentColor = Color.Unspecified,
    )
}
