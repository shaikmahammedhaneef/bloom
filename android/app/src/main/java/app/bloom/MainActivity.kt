package app.bloom

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Insights
import androidx.compose.material.icons.rounded.SentimentSatisfied
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import app.bloom.ui.screens.ChallengesScreen
import app.bloom.ui.screens.HabitDetailScreen
import app.bloom.ui.screens.HabitFormScreen
import app.bloom.ui.screens.HabitsScreen
import app.bloom.ui.screens.HealthScreen
import app.bloom.ui.screens.JournalScreen
import app.bloom.ui.screens.MoodHistoryScreen
import app.bloom.ui.screens.MoodScreen
import app.bloom.ui.screens.OnboardingScreen
import app.bloom.ui.screens.ProgressScreen
import app.bloom.ui.screens.SettingsScreen
import app.bloom.ui.screens.TemplatesScreen
import app.bloom.ui.screens.TimerScreen
import app.bloom.ui.screens.TodayScreen
import app.bloom.ui.screens.TodoFormScreen
import app.bloom.ui.theme.BloomTheme
import kotlinx.coroutines.flow.MutableStateFlow

class MainActivity : ComponentActivity() {
    /** A screen to open, from a tapped notification. */
    private val openRoute = MutableStateFlow<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        openRoute.value = intent.getStringExtra("route")
        val app = application as BloomApp
        setContent {
            val s by app.settings.flow.collectAsStateWithLifecycle()
            BloomTheme(s.accent, s.theme) {
                if (!s.onboarded) OnboardingScreen() else BloomNav(openRoute)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        openRoute.value = intent.getStringExtra("route")
    }

    override fun onResume() {
        super.onResume()
        // The day may have changed, or exact-alarm permission may have been granted.
        (application as BloomApp).requestReschedule()
    }
}

private data class Tab(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector, val group: List<String>)

private val TABS = listOf(
    Tab("today", "Today", Icons.Rounded.Home, listOf("today", "todo", "templates", "settings")),
    Tab("habits", "Habits", Icons.Rounded.CheckCircle, listOf("habits", "habit", "habitForm")),
    Tab("mood", "Mood", Icons.Rounded.SentimentSatisfied, listOf("mood", "journal", "moodHistory")),
    Tab("health", "Health", Icons.Rounded.Favorite, listOf("health", "timer")),
    Tab("progress", "Progress", Icons.Rounded.Insights, listOf("progress", "challenges")),
)

fun NavHostController.goTab(route: String) = navigate(route) {
    popUpTo(graph.findStartDestination().id) { saveState = true }
    launchSingleTop = true
    restoreState = true
}

@Composable
private fun BloomNav(openRoute: MutableStateFlow<String?>) {
    val nav = rememberNavController()
    val pending by openRoute.collectAsStateWithLifecycle()
    LaunchedEffect(pending) {
        pending?.let { nav.goTab(it); openRoute.value = null }
    }
    val entry by nav.currentBackStackEntryAsState()
    val current = entry?.destination?.route?.substringBefore("/")?.substringBefore("?") ?: "today"

    Scaffold(
        bottomBar = {
            NavigationBar {
                for (t in TABS) {
                    NavigationBarItem(
                        selected = current in t.group,
                        onClick = { nav.goTab(t.route) },
                        icon = { Icon(t.icon, null) },
                        label = { Text(t.label) },
                        colors = NavigationBarItemDefaults.colors(),
                    )
                }
            }
        },
    ) { pad ->
        NavHost(nav, startDestination = "today", modifier = Modifier.padding(bottom = pad.calculateBottomPadding())) {
            composable("today") { TodayScreen(nav) }
            composable("habits") { HabitsScreen(nav) }
            composable("habit/{id}", listOf(navArgument("id") { type = NavType.LongType })) { HabitDetailScreen(nav, it.arguments!!.getLong("id")) }
            composable("habitForm/{id}", listOf(navArgument("id") { type = NavType.LongType })) { HabitFormScreen(nav, it.arguments!!.getLong("id")) }
            composable("todo/{id}/{date}", listOf(navArgument("id") { type = NavType.LongType }, navArgument("date") { type = NavType.StringType })) {
                TodoFormScreen(nav, it.arguments!!.getLong("id"), it.arguments!!.getString("date")!!)
            }
            composable("templates") { TemplatesScreen(nav) }
            composable("settings") { SettingsScreen(nav) }
            composable("mood") { MoodScreen(nav) }
            composable("moodHistory") { MoodHistoryScreen(nav) }
            composable("journal") { JournalScreen(nav) }
            composable("health") { HealthScreen(nav) }
            composable("timer/{mode}") { TimerScreen(nav, it.arguments!!.getString("mode")!!) }
            composable("progress") { ProgressScreen(nav) }
            composable("challenges") { ChallengesScreen(nav) }
        }
    }
}
