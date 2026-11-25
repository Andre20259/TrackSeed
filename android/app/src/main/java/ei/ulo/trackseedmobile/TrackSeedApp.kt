package ei.ulo.trackseedmobile

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Route
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.toMutableStateList
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import ei.ulo.trackseedmobile.data.MockData
import ei.ulo.trackseedmobile.ui.screens.AlignmentScreen
import ei.ulo.trackseedmobile.ui.screens.CarRecognitionScreen
import ei.ulo.trackseedmobile.ui.screens.ConeCheckScreen
import ei.ulo.trackseedmobile.ui.screens.HistoryScreen
import ei.ulo.trackseedmobile.ui.screens.HomeScreen
import ei.ulo.trackseedmobile.ui.screens.LiveProgressScreen
import ei.ulo.trackseedmobile.ui.screens.PlacementScreen
import ei.ulo.trackseedmobile.ui.screens.SessionReportScreen
import ei.ulo.trackseedmobile.ui.screens.SettingsScreen
import ei.ulo.trackseedmobile.ui.screens.TrackDetailScreen
import ei.ulo.trackseedmobile.ui.screens.TracksScreen

private object Routes {
    const val HOME = "home"
    const val TRACKS = "tracks"
    const val HISTORY = "history"
    const val SETTINGS = "settings"
    const val TRACK = "track/{id}"
    const val ALIGN = "align"
    const val PLACE = "place"
    const val CHECK = "check"
    const val LIVE = "live"
    const val CAR = "car"
    const val REPORT = "report/{id}"
    fun track(id: String) = "track/$id"
    fun report(id: Int) = "report/$id"
}

private data class Tab(val route: String, val label: String, val icon: ImageVector, val selectedIcon: ImageVector)

private val tabs = listOf(
    Tab(Routes.HOME, "Home", Icons.Outlined.Home, Icons.Filled.Home),
    Tab(Routes.TRACKS, "Tracks", Icons.Outlined.Route, Icons.Filled.Route),
    Tab(Routes.HISTORY, "History", Icons.Outlined.History, Icons.Filled.History),
    Tab(Routes.SETTINGS, "Settings", Icons.Outlined.Settings, Icons.Filled.Settings),
)

@Composable
fun TrackSeedApp() {
    val nav = rememberNavController()
    val route = nav.currentBackStackEntryAsState().value?.destination?.route
    var cone by rememberSaveable { mutableIntStateOf(119) }
    val sessions = remember { MockData.sessions.toMutableStateList() }

    fun openTab(target: String) = nav.navigate(target) {
        popUpTo(Routes.HOME) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }

    Scaffold(
        // Each screen handles its own insets; this Scaffold only reserves room for the bottom bar.
        contentWindowInsets = WindowInsets(0),
        bottomBar = {
            if (tabs.any { it.route == route }) {
                NavigationBar {
                    tabs.forEach { tab ->
                        val selected = route == tab.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = { openTab(tab.route) },
                            icon = { Icon(if (selected) tab.selectedIcon else tab.icon, contentDescription = null) },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(nav, startDestination = Routes.HOME, modifier = Modifier.padding(padding).consumeWindowInsets(padding)) {
            composable(Routes.HOME) {
                HomeScreen(
                    onContinue = { nav.navigate(Routes.PLACE) },
                    onOpenTrack = { nav.navigate(Routes.track(it)) },
                    onSeeAll = { openTab(Routes.TRACKS) },
                )
            }
            composable(Routes.TRACKS) { TracksScreen(onOpenTrack = { nav.navigate(Routes.track(it)) }) }
            composable(Routes.HISTORY) {
                HistoryScreen(
                    sessions = sessions,
                    onOpen = { nav.navigate(Routes.report(it)) },
                    onDelete = { sessions.remove(it) },
                )
            }
            composable(Routes.SETTINGS) { SettingsScreen() }

            composable(Routes.TRACK, arguments = listOf(navArgument("id") { type = NavType.StringType })) { entry ->
                TrackDetailScreen(
                    track = MockData.track(entry.arguments?.getString("id")),
                    onBack = { nav.popBackStack() },
                    onStart = { nav.navigate(Routes.ALIGN) },
                )
            }
            composable(Routes.ALIGN) {
                AlignmentScreen(onAligned = { nav.navigate(Routes.PLACE) { popUpTo(Routes.ALIGN) { inclusive = true } } })
            }
            composable(Routes.PLACE) {
                PlacementScreen(
                    cone = cone,
                    onConeSeen = { nav.navigate(Routes.CHECK) },
                    onSkip = { cone++ },
                    onMap = { nav.navigate(Routes.LIVE) },
                )
            }
            composable(Routes.CHECK) {
                ConeCheckScreen(cone = cone, onNext = {
                    cone++
                    nav.popBackStack()
                })
            }
            composable(Routes.LIVE) {
                LiveProgressScreen(onBack = { nav.popBackStack() }, onFinish = { nav.navigate(Routes.CAR) })
            }
            composable(Routes.CAR) {
                CarRecognitionScreen(onConfirm = { car ->
                    // Today's session is always id 0 in the sample data.
                    sessions.removeAll { it.id == 0 }
                    sessions.add(0, MockData.sessions.first().copy(car = car))
                    nav.navigate(Routes.report(0)) { popUpTo(Routes.HOME) }
                })
            }
            composable(Routes.REPORT, arguments = listOf(navArgument("id") { type = NavType.IntType })) { entry ->
                val id = entry.arguments?.getInt("id") ?: 0
                SessionReportScreen(
                    session = sessions.firstOrNull { it.id == id } ?: MockData.sessions.first(),
                    onBack = { nav.popBackStack() },
                )
            }
        }
    }
}
