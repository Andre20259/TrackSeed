package ei.ulo.trackseedmobile.ui.components

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.LocalLifecycleOwner
import ei.ulo.trackseedmobile.ui.theme.DetectionGreen

/** Live back-camera preview (CameraX). Must be shown inside [CameraPermissionGate]. */
@Composable
fun CameraPreview(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val previewView = remember { PreviewView(context) }
    DisposableEffect(lifecycleOwner) {
        val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
        val future = ProcessCameraProvider.getInstance(context)
        future.addListener({
            future.get().bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview)
        }, ContextCompat.getMainExecutor(context))
        // Unbind only this screen's preview: the next camera screen may already be bound during the transition.
        onDispose { if (future.isDone) future.get().unbind(preview) }
    }
    AndroidView(factory = { previewView }, modifier = modifier)
}

/** Asks for the camera permission and shows [content] once it is granted. */
@Composable
fun CameraPermissionGate(content: @Composable () -> Unit) {
    val context = LocalContext.current
    fun hasCamera() =
        ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    var granted by remember { mutableStateOf(hasCamera()) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted = it }
    LaunchedEffect(Unit) { if (!granted) launcher.launch(Manifest.permission.CAMERA) }
    // Re-check when returning from the system settings.
    LifecycleResumeEffect(Unit) {
        granted = hasCamera()
        onPauseOrDispose { }
    }

    if (granted) {
        content()
        return
    }
    Column(
        Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface).statusBarsPadding().padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(Icons.Outlined.PhotoCamera, contentDescription = null, modifier = Modifier.size(48.dp))
        Spacer(Modifier.size(16.dp))
        Text("TrackSeed needs the camera for this step", style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center)
        Spacer(Modifier.size(24.dp))
        Button(onClick = { launcher.launch(Manifest.permission.CAMERA) }) { Text("Allow camera") }
        TextButton(onClick = {
            context.startActivity(
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null))
            )
        }) { Text("Open app settings") }
    }
}

/**
 * Full-screen camera layout shared by the placement flow: live preview, a header card at the top,
 * an overlay area in the middle and a Material bottom sheet.
 */
@Composable
fun CameraScreen(
    header: @Composable () -> Unit,
    sheet: @Composable ColumnScope.() -> Unit,
    onCameraTap: (() -> Unit)? = null,
    overlay: @Composable BoxScope.() -> Unit = {},
) {
    CameraPermissionGate {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            CameraPreview(Modifier.fillMaxSize())
            Column(Modifier.fillMaxSize()) {
                Box(Modifier.statusBarsPadding().padding(16.dp)) { header() }
                Box(
                    Modifier.weight(1f).fillMaxWidth()
                        .then(if (onCameraTap != null) Modifier.clickable(onClick = onCameraTap) else Modifier),
                    content = overlay,
                )
                CameraSheet(content = sheet)
            }
        }
    }
}

@Composable
fun CameraHeader(title: String, subtitle: String, modifier: Modifier = Modifier) {
    Surface(
        modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.inverseSurface.copy(alpha = 0.85f),
        contentColor = MaterialTheme.colorScheme.inverseOnSurface,
    ) {
        Column(Modifier.padding(horizontal = 20.dp, vertical = 14.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CameraSheet(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Surface(
        modifier.fillMaxWidth(),
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Column(
            Modifier.navigationBarsPadding().padding(start = 24.dp, end = 24.dp, bottom = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            BottomSheetDefaults.DragHandle()
            content()
        }
    }
}

/** Status line at the top of a camera sheet: big icon, title and subtitle. */
@Composable
fun SheetStatus(icon: ImageVector, title: String, subtitle: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(44.dp))
        Spacer(Modifier.width(16.dp))
        Column {
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** Corner brackets used when aiming at a marker or QR code. */
@Composable
fun ScanFrame(modifier: Modifier = Modifier, color: Color = DetectionGreen) {
    Canvas(modifier) {
        val l = size.minDimension * 0.18f
        val sw = 4.dp.toPx()
        val w = size.width
        val h = size.height
        listOf(Offset(0f, 0f) to (1 to 1), Offset(w, 0f) to (-1 to 1), Offset(0f, h) to (1 to -1), Offset(w, h) to (-1 to -1))
            .forEach { (o, d) ->
                drawLine(color, o, Offset(o.x + d.first * l, o.y), sw, StrokeCap.Round)
                drawLine(color, o, Offset(o.x, o.y + d.second * l), sw, StrokeCap.Round)
            }
    }
}

/** Labelled bounding box, as drawn by the on-device models. */
@Composable
fun DetectionBox(label: String, boxSize: DpSize, modifier: Modifier = Modifier) {
    Column(modifier) {
        Surface(color = DetectionGreen, contentColor = Color.Black, shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)) {
            Text(label, Modifier.padding(horizontal = 12.dp, vertical = 4.dp), style = MaterialTheme.typography.labelLarge)
        }
        Box(Modifier.size(boxSize).border(BorderStroke(3.dp, DetectionGreen), RoundedCornerShape(12.dp)))
    }
}

@Composable
fun Pill(text: String, container: Color, content: Color) {
    Surface(shape = CircleShape, color = container, contentColor = content) {
        Text(text, Modifier.padding(horizontal = 16.dp, vertical = 6.dp), style = MaterialTheme.typography.labelLarge)
    }
}
