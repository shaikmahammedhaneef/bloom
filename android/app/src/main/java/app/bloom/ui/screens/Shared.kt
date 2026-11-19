package app.bloom.ui.screens

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import app.bloom.BloomApp
import app.bloom.data.Dates

@Composable
fun bloomApp(): BloomApp = LocalContext.current.applicationContext as BloomApp

/** Today's date key, refreshed whenever the screen comes back (e.g. after midnight). */
@Composable
fun rememberToday(): String {
    var today by remember { mutableStateOf(Dates.today()) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { today = Dates.today() }
    return today
}
