@file:OptIn(ExperimentalMaterial3Api::class)

package app.bloom.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.bloom.ui.theme.LocalBloom

/**
 * Swipe left to delete. If `onDone` is given, swipe right to tick it off (the row springs back).
 * Pair the delete with an Undo snackbar so a stray swipe is never a loss.
 */
@Composable
fun SwipeRow(
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
    onDone: (() -> Unit)? = null,
    doneLabel: String = "Done",
    deleteLabel: String = "Delete",
    content: @Composable () -> Unit,
) {
    val b = LocalBloom.current
    val delete by rememberUpdatedState(onDelete)
    val done by rememberUpdatedState(onDone)
    val state = rememberSwipeToDismissBoxState(confirmValueChange = {
        when (it) {
            SwipeToDismissBoxValue.EndToStart -> { delete(); true }
            SwipeToDismissBoxValue.StartToEnd -> { done?.invoke(); false }
            else -> false
        }
    })
    SwipeToDismissBox(
        state = state,
        modifier = modifier,
        enableDismissFromStartToEnd = onDone != null,
        backgroundContent = {
            val dir = state.dismissDirection
            val toRight = dir == SwipeToDismissBoxValue.StartToEnd
            val bg = when (dir) { SwipeToDismissBoxValue.StartToEnd -> b.acc; SwipeToDismissBoxValue.EndToStart -> b.danger; else -> Color.Transparent }
            val fg = if (toRight) b.onAcc else if (b.dark) Color(0xFF2A1512) else Color.White
            Box(
                Modifier.fillMaxSize().clip(RoundedCornerShape(20.dp)).background(bg).padding(horizontal = 22.dp),
                contentAlignment = if (toRight) Alignment.CenterStart else Alignment.CenterEnd,
            ) {
                if (dir != SwipeToDismissBoxValue.Settled) Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(if (toRight) Icons.Rounded.Check else Icons.Rounded.Delete, null, tint = fg)
                    Text(if (toRight) doneLabel else deleteLabel, color = fg, fontWeight = FontWeight.SemiBold)
                }
            }
        },
        content = { content() },
    )
}
