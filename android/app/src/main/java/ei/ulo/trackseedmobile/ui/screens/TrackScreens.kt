package ei.ulo.trackseedmobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Article
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.outlined.Cloud
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.ViewInAr
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import ei.ulo.trackseedmobile.data.ConeColor
import ei.ulo.trackseedmobile.data.MockData
import ei.ulo.trackseedmobile.data.Session
import ei.ulo.trackseedmobile.data.Track
import ei.ulo.trackseedmobile.data.TrackType
import ei.ulo.trackseedmobile.ui.components.BackTopBar
import ei.ulo.trackseedmobile.ui.components.InitialsBadge
import ei.ulo.trackseedmobile.ui.components.StatCard
import ei.ulo.trackseedmobile.ui.components.TrackMap

/** Scrollable body shared by the secondary screens, with the back top bar. */
@Composable
private fun DetailScaffold(
    title: String,
    subtitle: String,
    onBack: () -> Unit,
    content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    Scaffold(topBar = { BackTopBar(title, subtitle, onBack) }) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            content = content,
        )
    }
}

// 04 Track detail
@Composable
fun TrackDetailScreen(track: Track, onBack: () -> Unit, onStart: () -> Unit) {
    DetailScaffold(track.name, "Uploaded by team lead · ${track.uploaded}", onBack) {
        ElevatedCard(Modifier.fillMaxWidth()) {
            Box(Modifier.fillMaxWidth().height(240.dp).padding(16.dp)) {
                TrackMap(track.type, Modifier.fillMaxSize(), dotSize = 3.5.dp)
                Text("N ↑", Modifier.align(Alignment.TopStart), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("Start / finish", Modifier.align(Alignment.BottomEnd), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatCard("${track.cones}", "cones", Modifier.weight(1f))
            StatCard(track.lengthText ?: "—", "length", Modifier.weight(1f))
            StatCard("±15 cm", "tolerance", Modifier.weight(1f))
        }
        Text("Cones by colour", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 8.dp))
        ElevatedCard(Modifier.fillMaxWidth()) {
            // shortcut: sample split, the real counts come from the track JSON.
            val orange = track.cones * 3 / 19
            val blue = (track.cones - orange) / 2
            Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                ConeCount(ConeColor.Blue, "$blue")
                ConeCount(ConeColor.Yellow, "${track.cones - orange - blue}")
                ConeCount(ConeColor.Orange, "$orange")
            }
        }
        Button(onClick = onStart, modifier = Modifier.fillMaxWidth().height(56.dp)) {
            Icon(Icons.Outlined.ViewInAr, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text("Start session", style = MaterialTheme.typography.titleMedium)
        }
        Row(Modifier.align(Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) {
            Icon(
                if (track.downloaded) Icons.Filled.CheckCircle else Icons.Outlined.Download,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp),
            )
            Spacer(Modifier.width(8.dp))
            Text(
                if (track.downloaded) "Downloaded · works offline" else "Not downloaded yet",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

// 08 Live progress
@Composable
fun LiveProgressScreen(onBack: () -> Unit, onFinish: () -> Unit) {
    val c = MaterialTheme.colorScheme
    DetailScaffold("Live progress", "Autocross v3 · synced 2 s ago", onBack) {
        ElevatedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                TrackMap(TrackType.Autocross, Modifier.fillMaxWidth().height(220.dp), progress = 0.62f, wrongIndex = 10, dotSize = 3.5.dp)
                Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                    Legend("Placed", c.primary, filled = true)
                    Legend("Missing", c.outline, filled = false)
                    Legend("Wrong", c.error, filled = true)
                }
            }
        }
        Card(colors = CardDefaults.cardColors(containerColor = c.errorContainer, contentColor = c.onErrorContainer)) {
            ListItem(
                headlineContent = { Text("Cone 87: wrong colour", style = MaterialTheme.typography.titleMedium) },
                supportingContent = { Text("Yellow found, blue expected") },
                leadingContent = { Icon(Icons.Filled.Error, contentDescription = null, tint = c.error) },
                colors = ListItemDefaults.colors(
                    containerColor = Color.Transparent,
                    headlineColor = c.onErrorContainer,
                    supportingColor = c.onErrorContainer,
                ),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatCard("118", "placed", Modifier.weight(1f))
            StatCard("72", "missing", Modifier.weight(1f))
            StatCard("1", "wrong", Modifier.weight(1f))
        }
        MemberRow("TL", "Team lead", "Watching on the dashboard", "online")
        Button(onClick = onFinish, modifier = Modifier.fillMaxWidth().height(56.dp)) {
            Text("Finish track", style = MaterialTheme.typography.titleMedium)
        }
    }
}

@Composable
private fun Legend(label: String, color: Color, filled: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        val dot = Modifier.size(12.dp)
        Box(if (filled) dot.background(color, CircleShape) else dot.border(2.dp, color, CircleShape))
        Spacer(Modifier.width(8.dp))
        Text(label, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun MemberRow(initials: String, name: String, role: String, status: String, done: Boolean = false) {
    ElevatedCard(Modifier.fillMaxWidth()) {
        ListItem(
            headlineContent = { Text(name, style = MaterialTheme.typography.titleMedium) },
            supportingContent = { Text(role) },
            leadingContent = { InitialsBadge(initials) },
            trailingContent = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        status,
                        style = MaterialTheme.typography.titleSmall,
                        color = if (done) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (done) {
                        Spacer(Modifier.width(8.dp))
                        Icon(Icons.Filled.CheckCircle, contentDescription = "Done", tint = MaterialTheme.colorScheme.primary)
                    }
                }
            },
            colors = ListItemDefaults.colors(containerColor = Color.Transparent),
        )
    }
}

// 10 Session report
@Composable
fun SessionReportScreen(session: Session, onBack: () -> Unit) {
    val track = MockData.track(session.trackId)
    val c = MaterialTheme.colorScheme
    var notes by rememberSaveable(session.id) {
        mutableStateOf(if (session.id == 0) "Wet patch near cone 120; skidpad runs moved to the afternoon." else "")
    }
    DetailScaffold("Session report", "${session.date} 2026 · Leiria test field", onBack) {
        Card(colors = CardDefaults.cardColors(containerColor = c.inverseSurface, contentColor = c.inverseOnSurface)) {
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Surface(Modifier.size(104.dp), shape = MaterialTheme.shapes.medium, color = c.surfaceContainerLowest) {
                    TrackMap(track.type, Modifier.fillMaxSize().padding(10.dp), dotSize = 2.dp)
                }
                Spacer(Modifier.width(16.dp))
                Column {
                    Text("TRACK", style = MaterialTheme.typography.labelMedium, color = c.inverseOnSurface.copy(alpha = 0.7f))
                    Text(track.name, style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(8.dp))
                    Text("CAR", style = MaterialTheme.typography.labelMedium, color = c.inverseOnSurface.copy(alpha = 0.7f))
                    Surface(shape = CircleShape, color = c.inversePrimary.copy(alpha = 0.2f), contentColor = c.inversePrimary) {
                        Text(session.car, Modifier.padding(horizontal = 14.dp, vertical = 4.dp), style = MaterialTheme.typography.labelLarge)
                    }
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatCard("${session.setupMin} min", "setup time", Modifier.weight(1f), supporting = "−35% vs tape")
            StatCard("${track.cones}/${track.cones}", "cones placed", Modifier.weight(1f), supporting = "3 corrected")
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatCard("7 cm", "median error", Modifier.weight(1f), supporting = "max 14 cm")
            StatCard("${session.setupMin}", "person-minutes", Modifier.weight(1f), supporting = "1 placer")
        }
        ElevatedCard(Modifier.fillMaxWidth()) {
            ListItem(
                headlineContent = { Text("14 °C · cloudy · wind 12 km/h", style = MaterialTheme.typography.titleMedium) },
                supportingContent = { Text("Weather at the start of the session") },
                leadingContent = { Icon(Icons.Outlined.Cloud, contentDescription = null, tint = c.tertiary) },
                colors = ListItemDefaults.colors(containerColor = Color.Transparent),
            )
        }
        Text("Notes", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 8.dp))
        OutlinedTextField(
            value = notes,
            onValueChange = { notes = it },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3,
            placeholder = { Text("Add notes about this session") },
        )
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            // shortcut: PDF export and sharing (C12) not implemented yet.
            Button(onClick = { }, modifier = Modifier.weight(1f).height(56.dp)) {
                Icon(Icons.AutoMirrored.Outlined.Article, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Export PDF")
            }
            OutlinedButton(onClick = { }, modifier = Modifier.weight(1f).height(56.dp)) {
                Icon(Icons.Outlined.Share, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Share")
            }
        }
    }
}
