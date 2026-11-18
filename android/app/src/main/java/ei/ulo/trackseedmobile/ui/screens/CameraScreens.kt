package ei.ulo.trackseedmobile.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import ei.ulo.trackseedmobile.data.ConeColor
import ei.ulo.trackseedmobile.data.MockData
import ei.ulo.trackseedmobile.data.TrackType
import ei.ulo.trackseedmobile.ui.components.CameraHeader
import ei.ulo.trackseedmobile.ui.components.CameraScreen
import ei.ulo.trackseedmobile.ui.components.ConeDot
import ei.ulo.trackseedmobile.ui.components.DetectionBox
import ei.ulo.trackseedmobile.ui.components.Pill
import ei.ulo.trackseedmobile.ui.components.ScanFrame
import ei.ulo.trackseedmobile.ui.components.SheetStatus
import ei.ulo.trackseedmobile.ui.components.TrackMap
import ei.ulo.trackseedmobile.ui.components.drawCone
import ei.ulo.trackseedmobile.ui.theme.DetectionGreen
import kotlinx.coroutines.delay

// The AR content, detections and model outputs on these screens are static placeholders drawn over
// the live camera; ARCore and LiteRT are added when the features are implemented.

// Team QR code scan, opened from onboarding
@Composable
fun QrScanScreen(onBack: () -> Unit) {
    CameraScreen(
        header = { CameraHeader("Scan team QR code", "Point the camera at the code on the team dashboard") },
        overlay = { ScanFrame(Modifier.align(Alignment.Center).size(240.dp)) },
        sheet = {
            Text(
                "QR reading is not active yet. Enter the team code by hand for now.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
            OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth().height(48.dp)) { Text("Enter code instead") }
        },
    )
}

// 05 AR alignment
@Composable
fun AlignmentScreen(onAligned: () -> Unit) {
    var step by rememberSaveable { mutableIntStateOf(1) }
    val markerA = step == 1
    CameraScreen(
        header = {
            CameraHeader(
                "Align track · Step $step of 2",
                if (markerA) "Point the camera at the start-line marker" else "Point the camera at marker B",
            )
        },
        overlay = { ScanFrame(Modifier.align(Alignment.Center).size(240.dp)) },
        sheet = {
            SheetStatus(
                Icons.Filled.CheckCircle,
                if (markerA) "Marker A detected" else "Marker B detected",
                if (markerA) "Start line · tracking quality good" else "40 m from marker A · tracking quality good",
            )
            Surface(Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerHighest) {
                Text(
                    if (markerA) "Next: walk to marker B (40 m ahead)" else "Position and heading fixed · ready to place cones",
                    Modifier.padding(16.dp),
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
            Button(
                onClick = { if (markerA) step = 2 else onAligned() },
                modifier = Modifier.fillMaxWidth().height(56.dp),
            ) { Text(if (markerA) "Continue" else "Start placing", style = MaterialTheme.typography.titleMedium) }
        },
    )
}

// 06 AR placement
@Composable
fun PlacementScreen(cone: Int, onConeSeen: () -> Unit, onSkip: () -> Unit, onMap: () -> Unit) {
    CameraScreen(
        header = {
            Column(horizontalAlignment = Alignment.End) {
                CameraHeader("Cone $cone of 190", "Autocross v3 · ${cone - 1} placed")
                Spacer(Modifier.height(12.dp))
                Surface(
                    Modifier.size(96.dp),
                    shape = MaterialTheme.shapes.medium,
                    color = MaterialTheme.colorScheme.inverseSurface.copy(alpha = 0.85f),
                ) {
                    TrackMap(
                        TrackType.Autocross,
                        Modifier.fillMaxSize().padding(8.dp),
                        progress = 0.62f,
                        currentIndex = 44,
                        missingColor = MaterialTheme.colorScheme.inverseOnSurface.copy(alpha = 0.5f),
                        dotSize = 1.6.dp,
                    )
                }
            }
        },
        // shortcut: tapping the view stands in for the cone detector until LiteRT is wired in.
        onCameraTap = onConeSeen,
        overlay = { PlacementTarget(cone, Modifier.align(Alignment.Center)) },
        sheet = {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                ConeDot(ConeColor.Blue, 40.dp)
                Spacer(Modifier.width(16.dp))
                Column {
                    Text("Place a BLUE cone here", style = MaterialTheme.typography.titleLarge)
                    Text(
                        "The camera checks it automatically",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                FilledTonalButton(onClick = onSkip, modifier = Modifier.weight(1f).height(48.dp)) { Text("Skip") }
                FilledTonalButton(onClick = onMap, modifier = Modifier.weight(1f).height(48.dp)) { Text("Map") }
            }
        },
    )
}

@Composable
private fun PlacementTarget(cone: Int, modifier: Modifier) {
    val c = MaterialTheme.colorScheme
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Pill("Cone $cone · Blue", c.inverseSurface.copy(alpha = 0.9f), c.inverseOnSurface)
        Canvas(Modifier.size(width = 170.dp, height = 140.dp)) {
            val ring = Size(size.width, size.height * 0.4f)
            val ringTop = Offset(0f, size.height * 0.6f)
            drawOval(ConeColor.Blue.color.copy(alpha = 0.25f), ringTop, ring)
            drawOval(
                Color.White, ringTop, ring,
                style = Stroke(3.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(18f, 12f))),
            )
            drawCone(ConeColor.Blue.color, Offset(size.width * 0.29f, 0f), Size(size.width * 0.42f, size.height * 0.82f), alpha = 0.55f)
        }
        Spacer(Modifier.height(12.dp))
        Pill("1.2 m ahead", c.surface, c.onSurface)
        Icon(Icons.Filled.ArrowUpward, contentDescription = null, tint = DetectionGreen, modifier = Modifier.size(56.dp))
    }
}

// 07 Cone check
@Composable
fun ConeCheckScreen(cone: Int, onNext: () -> Unit) {
    var seconds by remember { mutableIntStateOf(2) }
    val next by rememberUpdatedState(onNext)
    LaunchedEffect(Unit) {
        while (seconds > 0) {
            delay(1000)
            seconds--
        }
        next()
    }
    CameraScreen(
        header = { CameraHeader("Cone $cone of 190", "Autocross v3 · $cone placed") },
        overlay = { DetectionBox("Blue cone · 97%", DpSize(130.dp, 150.dp), Modifier.align(Alignment.Center)) },
        sheet = {
            SheetStatus(Icons.Filled.CheckCircle, "Cone $cone confirmed", "Saved to the track twin")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MiniStat("Colour", "Blue ✓", highlight = true, modifier = Modifier.weight(1f))
                MiniStat("Position error", "6 cm", highlight = true, modifier = Modifier.weight(1f))
                MiniStat("Tolerance", "15 cm", highlight = false, modifier = Modifier.weight(1f))
            }
            Text(
                "Next cone in $seconds s…",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
    )
}

@Composable
private fun MiniStat(label: String, value: String, highlight: Boolean, modifier: Modifier) {
    Surface(modifier, shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerHighest) {
        Column(Modifier.padding(12.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                value,
                style = MaterialTheme.typography.titleMedium,
                color = if (highlight) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

// 09 Car recognition
@Composable
fun CarRecognitionScreen(onConfirm: (String) -> Unit) {
    var car by rememberSaveable { mutableStateOf(MockData.cars.first().name) }
    var choosing by remember { mutableStateOf(false) }
    val info = MockData.cars.first { it.name == car }
    CameraScreen(
        header = { CameraHeader("Which car runs today?", "Point the camera at the car") },
        overlay = {
            Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                DetectionBox("$car · ${info.confidence}%", DpSize(300.dp, 150.dp))
                Spacer(Modifier.height(24.dp))
                // shortcut: shutter does nothing until CarNet (C11) runs on the captured frame.
                Surface(
                    onClick = { },
                    shape = CircleShape,
                    color = Color.Transparent,
                    border = BorderStroke(4.dp, Color.White),
                    modifier = Modifier.size(76.dp),
                ) {
                    Box(Modifier.padding(8.dp).background(Color.White, CircleShape))
                }
            }
        },
        sheet = {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Surface(Modifier.size(56.dp), shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.secondaryContainer) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.DirectionsCar, contentDescription = null, tint = MaterialTheme.colorScheme.onSecondaryContainer)
                    }
                }
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Text(car, style = MaterialTheme.typography.headlineSmall)
                    Text(info.description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Surface(shape = CircleShape, color = MaterialTheme.colorScheme.secondaryContainer) {
                    Text("${info.confidence}%", Modifier.padding(horizontal = 12.dp, vertical = 6.dp), style = MaterialTheme.typography.labelLarge)
                }
            }
            Button(onClick = { onConfirm(car) }, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                Text("Yes, it's the $car", style = MaterialTheme.typography.titleMedium)
            }
            TextButton(onClick = { choosing = true }) { Text("Choose another car") }
        },
    )

    if (choosing) {
        AlertDialog(
            onDismissRequest = { choosing = false },
            title = { Text("Choose the car") },
            text = {
                Column {
                    MockData.cars.forEach { option ->
                        Row(
                            Modifier.fillMaxWidth().clickable { car = option.name; choosing = false }.padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            RadioButton(selected = option.name == car, onClick = null)
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text(option.name, style = MaterialTheme.typography.titleMedium)
                                Text(option.description, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { choosing = false }) { Text("Cancel") } },
        )
    }
}
