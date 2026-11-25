package ei.ulo.trackseedmobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.ViewInAr
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import ei.ulo.trackseedmobile.data.ConeColor
import ei.ulo.trackseedmobile.data.MockData
import ei.ulo.trackseedmobile.data.Session
import ei.ulo.trackseedmobile.data.TrackType
import ei.ulo.trackseedmobile.ui.components.ConeDot
import ei.ulo.trackseedmobile.ui.components.TabHeader
import ei.ulo.trackseedmobile.ui.components.TrackCard
import ei.ulo.trackseedmobile.ui.components.TrackThumb
import kotlin.math.roundToInt

// 02 Home
@Composable
fun HomeScreen(onContinue: () -> Unit, onOpenTrack: (String) -> Unit, onSeeAll: () -> Unit) {
    val recent = MockData.tracks.filter { it.lastUsed != null }.take(2)
    LazyColumn(contentPadding = PaddingValues(bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { TabHeader("TrackSeed", "FS Team Leiria · team lead online") }
        item { TodaySessionCard(Modifier.padding(horizontal = 16.dp)) }
        item {
            Button(onClick = onContinue, modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth().height(56.dp)) {
                Icon(Icons.Outlined.ViewInAr, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Continue placing", style = MaterialTheme.typography.titleMedium)
            }
        }
        item {
            OutlinedCard(Modifier.padding(horizontal = 16.dp).fillMaxWidth()) {
                ListItem(
                    headlineContent = { Text("Next: cone 119 · Blue") },
                    supportingContent = { Text("72 left to place · 3 left to check") },
                    leadingContent = { ConeDot(ConeColor.Blue, 40.dp) },
                    colors = ListItemDefaults.colors(containerColor = Color.Transparent),
                )
            }
        }
        item {
            Row(Modifier.padding(start = 16.dp, end = 4.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Recent tracks", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                TextButton(onClick = onSeeAll) { Text("See all") }
            }
        }
        items(recent, key = { it.id }) { t ->
            TrackCard(t, "${t.cones} cones · used ${t.lastUsed}") { onOpenTrack(t.id) }
        }
    }
}

@Composable
private fun TodaySessionCard(modifier: Modifier) {
    val c = MaterialTheme.colorScheme
    Card(
        modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = c.inverseSurface, contentColor = c.inverseOnSurface),
    ) {
        Column(Modifier.padding(20.dp)) {
            Text("TODAY'S SESSION", style = MaterialTheme.typography.labelLarge, color = c.inverseOnSurface.copy(alpha = 0.7f))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Autocross v3", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
                Text("62%", style = MaterialTheme.typography.headlineSmall, color = c.inversePrimary)
            }
            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(
                progress = { 0.62f },
                modifier = Modifier.fillMaxWidth().height(8.dp),
                color = c.inversePrimary,
                trackColor = c.inverseOnSurface.copy(alpha = 0.2f),
            )
            Spacer(Modifier.height(8.dp))
            Text("118 of 190 cones placed", style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                ConeCount(ConeColor.Blue, "52/80")
                ConeCount(ConeColor.Yellow, "54/80")
                ConeCount(ConeColor.Orange, "12/30")
            }
        }
    }
}

@Composable
internal fun ConeCount(color: ConeColor, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        ConeDot(color, 14.dp)
        Spacer(Modifier.width(8.dp))
        Text(text, style = MaterialTheme.typography.titleSmall)
    }
}

// 03 Tracks
@Composable
fun TracksScreen(onOpenTrack: (String) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf<TrackType?>(null) }
    val shown = MockData.tracks.filter {
        (filter == null || it.type == filter) && it.name.contains(query.trim(), ignoreCase = true)
    }
    Box(Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { TabHeader("Tracks", "Team library · ${MockData.tracks.size} tracks") }
            item {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth(),
                    placeholder = { Text("Search tracks") },
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                    singleLine = true,
                    shape = CircleShape,
                )
            }
            item {
                Row(
                    Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    FilterChip(selected = filter == null, onClick = { filter = null }, label = { Text("All") })
                    TrackType.entries.forEach { t ->
                        FilterChip(selected = filter == t, onClick = { filter = t }, label = { Text(t.short) })
                    }
                }
            }
            items(shown, key = { it.id }) { t -> TrackCard(t, t.metaLine) { onOpenTrack(t.id) } }
            if (shown.isEmpty()) {
                item { Text("No tracks match", Modifier.padding(16.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
        ExtendedFloatingActionButton(
            onClick = { /* shortcut: track import (C4) not implemented yet */ },
            icon = { Icon(Icons.Filled.Add, contentDescription = null) },
            text = { Text("Import") },
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
        )
    }
}

// 11 History
@Composable
fun HistoryScreen(sessions: List<Session>, onOpen: (Int) -> Unit, onDelete: (Session) -> Unit) {
    var car by rememberSaveable { mutableStateOf<String?>(null) }
    val shown = sessions.filter { car == null || it.car == car }
    LazyColumn(contentPadding = PaddingValues(bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { TabHeader("History", "${sessions.size} sessions this season") }
        item {
            Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = car == null, onClick = { car = null }, label = { Text("All cars") })
                MockData.cars.forEach { c ->
                    FilterChip(selected = car == c.name, onClick = { car = c.name }, label = { Text(c.name) })
                }
            }
        }
        items(shown, key = { it.id }) { s ->
            SwipeToDelete(onDelete = { onDelete(s) }) {
                val track = MockData.track(s.trackId)
                ElevatedCard(onClick = { onOpen(s.id) }, modifier = Modifier.fillMaxWidth()) {
                    ListItem(
                        headlineContent = { Text(track.name, style = MaterialTheme.typography.titleMedium) },
                        supportingContent = { Text("${s.date} · setup ${s.setupMin} min") },
                        leadingContent = { TrackThumb(track.type) },
                        trailingContent = {
                            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.secondaryContainer) {
                                Text(s.car, Modifier.padding(horizontal = 14.dp, vertical = 6.dp), style = MaterialTheme.typography.labelLarge)
                            }
                        },
                        colors = ListItemDefaults.colors(containerColor = Color.Transparent),
                    )
                }
            }
        }
        item {
            Text(
                "Swipe left on a session to delete it",
                Modifier.fillMaxWidth().padding(16.dp),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SwipeToDelete(onDelete: () -> Unit, content: @Composable () -> Unit) {
    val state = rememberSwipeToDismissBoxState()
    LaunchedEffect(state.currentValue) {
        if (state.currentValue == SwipeToDismissBoxValue.EndToStart) onDelete()
    }
    SwipeToDismissBox(
        state = state,
        modifier = Modifier.padding(horizontal = 16.dp),
        enableDismissFromStartToEnd = false,
        backgroundContent = {
            Box(
                Modifier.fillMaxSize()
                    .background(MaterialTheme.colorScheme.errorContainer, CardDefaults.elevatedShape)
                    .padding(end = 24.dp),
                contentAlignment = Alignment.CenterEnd,
            ) {
                Icon(Icons.Outlined.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.onErrorContainer)
            }
        },
    ) { content() }
}

// 12 Settings
@Composable
fun SettingsScreen() {
    // shortcut: settings live only in memory, move to DataStore when the features use them.
    var tolerance by rememberSaveable { mutableFloatStateOf(15f) }
    var haptics by rememberSaveable { mutableStateOf(true) }
    var arrows by rememberSaveable { mutableStateOf(true) }
    var wifiOnly by rememberSaveable { mutableStateOf(false) }
    val offline = MockData.tracks.count { it.downloaded }

    LazyColumn(contentPadding = PaddingValues(bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { TabHeader("Settings") }
        item { SectionLabel("Placement") }
        item {
            SettingsCard {
                Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Position tolerance", style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                        Text("${tolerance.roundToInt()} cm", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                    }
                    Slider(value = tolerance, onValueChange = { tolerance = it }, valueRange = 5f..30f, steps = 4)
                }
                HorizontalDivider()
                SwitchRow("Haptic feedback", haptics) { haptics = it }
                HorizontalDivider()
                SwitchRow("Guide arrows in AR", arrows) { arrows = it }
            }
        }
        item { SectionLabel("Data") }
        item {
            SettingsCard {
                ListItem(
                    headlineContent = { Text("Offline tracks") },
                    trailingContent = { Text("$offline · 4.2 MB") },
                    colors = ListItemDefaults.colors(containerColor = Color.Transparent),
                )
                HorizontalDivider()
                SwitchRow("Sync only on Wi-Fi", wifiOnly) { wifiOnly = it }
            }
        }
        item { SectionLabel("Models (updated remotely)") }
        item {
            SettingsCard {
                listOf("Cone check v1.2", "CarNet v0.3").forEach { model ->
                    ListItem(
                        headlineContent = { Text(model) },
                        trailingContent = { Text("on device") },
                        colors = ListItemDefaults.colors(containerColor = Color.Transparent),
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingsCard(content: @Composable () -> Unit) {
    ElevatedCard(Modifier.padding(horizontal = 16.dp).fillMaxWidth()) { content() }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text,
        Modifier.padding(start = 16.dp, top = 16.dp, bottom = 4.dp),
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary,
    )
}

@Composable
private fun SwitchRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    ListItem(
        headlineContent = { Text(label) },
        trailingContent = { Switch(checked = checked, onCheckedChange = onChange) },
        colors = ListItemDefaults.colors(containerColor = Color.Transparent),
    )
}
