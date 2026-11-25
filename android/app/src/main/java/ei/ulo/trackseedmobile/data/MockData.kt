package ei.ulo.trackseedmobile.data

import androidx.compose.ui.graphics.Color
import java.util.Locale
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin

// shortcut: hard-coded sample data for the mockup screens, replace with Room + the TrackSeed API.

enum class ConeColor(val color: Color, val label: String) {
    Blue(Color(0xFF2563EB), "Blue"),
    Yellow(Color(0xFFEAB308), "Yellow"),
    Orange(Color(0xFFF97316), "Orange"),
}

enum class TrackType(val label: String, val short: String) {
    Skidpad("Skidpad", "Skidpad"),
    Acceleration("Acceleration", "Accel."),
    Autocross("Autocross", "Autocross"),
    Trackdrive("Trackdrive", "Trackdrive"),
}

data class Cone(val x: Float, val y: Float, val color: ConeColor)

data class Track(
    val id: String,
    val name: String,
    val type: TrackType,
    val cones: Int,
    val lengthM: Int?,
    val downloaded: Boolean,
    val uploaded: String,
    val lastUsed: String? = null,
) {
    val lengthText: String?
        get() = when {
            lengthM == null -> null
            lengthM >= 1000 -> String.format(Locale.US, "%.1f km", lengthM / 1000.0)
            else -> "$lengthM m"
        }
    val metaLine: String get() = listOfNotNull(type.label, "$cones cones", lengthText).joinToString(" · ")
}

data class Session(val id: Int, val trackId: String, val date: String, val setupMin: Int, val car: String)

data class Car(val name: String, val description: String, val confidence: Int)

object MockData {
    val tracks = listOf(
        Track("autocross-v3", "Autocross v3", TrackType.Autocross, 190, 640, true, "20 Oct"),
        Track("skidpad-fsg", "Skidpad (FSG)", TrackType.Skidpad, 64, null, true, "2 Sep", "18 Oct"),
        Track("accel-75", "Acceleration 75 m", TrackType.Acceleration, 44, 75, true, "2 Sep", "11 Oct"),
        Track("trackdrive-leiria", "Trackdrive Leiria", TrackType.Trackdrive, 312, 1100, false, "12 Oct"),
        Track("autocross-v2", "Autocross v2", TrackType.Autocross, 176, 590, false, "28 Sep", "04 Oct"),
        Track("accel-fss", "Acceleration (FSS)", TrackType.Acceleration, 48, 75, false, "5 Sep"),
    )

    val sessions = listOf(
        Session(0, "autocross-v3", "22 Oct", 48, "T26"),
        Session(1, "skidpad-fsg", "18 Oct", 21, "T26"),
        Session(2, "accel-75", "11 Oct", 15, "T24"),
        Session(3, "autocross-v2", "04 Oct", 62, "T24"),
        Session(4, "skidpad-fsg", "27 Sep", 24, "T24"),
    )

    val cars = listOf(
        Car("T26", "2026 car · driverless kit fitted", 94),
        Car("T24", "2024 car", 5),
    )

    fun track(id: String?) = tracks.firstOrNull { it.id == id } ?: tracks.first()
}

/** Cone positions in arbitrary units, ordered along the track so a progress fraction makes sense. */
fun coneLayout(type: TrackType): List<Cone> = when (type) {
    TrackType.Autocross -> loop(36, 0.0)
    TrackType.Trackdrive -> loop(48, 0.12)
    TrackType.Acceleration -> (0..10).flatMap { i ->
        listOf(
            Cone(i.toFloat(), 0f, if (i == 10) ConeColor.Orange else ConeColor.Blue),
            Cone(i.toFloat(), 1.2f, if (i == 0) ConeColor.Orange else ConeColor.Yellow),
        )
    }
    TrackType.Skidpad -> skidpad()
}

private fun loop(n: Int, wobble: Double): List<Cone> {
    // Rounded, tear-drop shaped closed course; blue on one side, yellow on the other.
    fun centre(t: Double) = (cos(t)) to ((0.62 - 0.22 * cos(t) + wobble * sin(3 * t)) * sin(t))
    val halfWidth = 0.11
    return (0 until n).flatMap { i ->
        val t = 2 * PI * i / n
        val (x, y) = centre(t)
        val (x1, y1) = centre(t + 1e-3)
        val (x0, y0) = centre(t - 1e-3)
        val len = hypot(x1 - x0, y1 - y0)
        val nx = -(y1 - y0) / len
        val ny = (x1 - x0) / len
        val start = i == 0
        listOf(
            Cone((x + nx * halfWidth).toFloat(), (y + ny * halfWidth).toFloat(), if (start) ConeColor.Orange else ConeColor.Blue),
            Cone((x - nx * halfWidth).toFloat(), (y - ny * halfWidth).toFloat(), if (start) ConeColor.Orange else ConeColor.Yellow),
        )
    }
}

private fun skidpad(): List<Cone> {
    val cones = mutableListOf<Cone>()
    for (cx in listOf(-1.0, 1.0)) {
        repeat(14) { i ->
            val a = 2 * PI * i / 14
            cones += Cone((cx + 0.62 * cos(a)).toFloat(), (0.62 * sin(a)).toFloat(), ConeColor.Blue)
        }
        repeat(22) { i ->
            val a = 2 * PI * i / 22
            val x = cx + cos(a)
            val y = sin(a)
            if (hypot(x + cx, y) >= 1.0) cones += Cone(x.toFloat(), y.toFloat(), ConeColor.Yellow)
        }
    }
    cones += Cone(0f, -1.1f, ConeColor.Orange)
    cones += Cone(0f, 1.1f, ConeColor.Orange)
    return cones
}
