package ei.ulo.trackseedmobile.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import ei.ulo.trackseedmobile.data.ConeColor
import ei.ulo.trackseedmobile.data.Track
import ei.ulo.trackseedmobile.data.TrackType

/** Large title at the top of the four main tabs. */
@Composable
fun TabHeader(title: String, subtitle: String? = null) {
    Column(Modifier.statusBarsPadding().padding(start = 16.dp, end = 16.dp, top = 24.dp, bottom = 8.dp)) {
        Text(title, style = MaterialTheme.typography.headlineLarge)
        if (subtitle != null) {
            Text(subtitle, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BackTopBar(title: String, subtitle: String, onBack: () -> Unit) {
    TopAppBar(
        title = {
            Column {
                Text(title)
                Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        navigationIcon = {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") }
        },
    )
}

@Composable
fun StatCard(value: String, label: String, modifier: Modifier = Modifier, supporting: String? = null) {
    ElevatedCard(modifier) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Text(value, style = MaterialTheme.typography.headlineSmall)
            Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (supporting != null) {
                Text(supporting, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}

@Composable
fun TrackThumb(type: TrackType, size: Dp = 56.dp) {
    Surface(Modifier.size(size), shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerHighest) {
        TrackMap(type, Modifier.fillMaxSize().padding(6.dp), dotSize = 1.6.dp)
    }
}

@Composable
fun TrackCard(track: Track, supporting: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    ElevatedCard(onClick = onClick, modifier = modifier.padding(horizontal = 16.dp).fillMaxWidth()) {
        ListItem(
            headlineContent = { Text(track.name, style = MaterialTheme.typography.titleMedium) },
            supportingContent = { Text(supporting) },
            leadingContent = { TrackThumb(track.type) },
            trailingContent = {
                if (track.downloaded) {
                    Icon(Icons.Filled.CheckCircle, contentDescription = "Downloaded", tint = MaterialTheme.colorScheme.primary)
                } else {
                    Icon(Icons.Outlined.Download, contentDescription = "Not downloaded")
                }
            },
            colors = ListItemDefaults.colors(containerColor = Color.Transparent),
        )
    }
}

@Composable
fun ConeDot(color: ConeColor, size: Dp = 12.dp) {
    Box(Modifier.size(size).background(color.color, CircleShape))
}

@Composable
fun InitialsBadge(text: String, shape: Shape = CircleShape, size: Dp = 44.dp) {
    Surface(
        Modifier.size(size),
        shape = shape,
        color = MaterialTheme.colorScheme.secondaryContainer,
        contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
    ) {
        Box(contentAlignment = Alignment.Center) { Text(text, style = MaterialTheme.typography.titleSmall) }
    }
}

/** App mark: a cone on the brand green, as in the onboarding mockup. */
@Composable
fun AppMark(size: Dp = 96.dp) {
    Surface(Modifier.size(size), shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.primary) {
        Canvas(Modifier.fillMaxSize().padding(size / 5)) { drawCone(ConeColor.Orange.color) }
    }
}
