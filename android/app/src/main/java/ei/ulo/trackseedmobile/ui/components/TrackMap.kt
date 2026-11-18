package ei.ulo.trackseedmobile.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import ei.ulo.trackseedmobile.data.ConeColor
import ei.ulo.trackseedmobile.data.TrackType
import ei.ulo.trackseedmobile.data.coneLayout
import kotlin.math.min

/**
 * Top-down map of a track. Cones after [progress] are drawn as hollow (missing),
 * [wrongIndex] gets a red ring and [currentIndex] a highlighted dot.
 */
@Composable
fun TrackMap(
    type: TrackType,
    modifier: Modifier = Modifier,
    progress: Float = 1f,
    wrongIndex: Int? = null,
    currentIndex: Int? = null,
    missingColor: Color = MaterialTheme.colorScheme.outline,
    dotSize: Dp = 4.dp,
) {
    val cones = remember(type) { coneLayout(type) }
    val wrongColor = MaterialTheme.colorScheme.error
    val currentColor = MaterialTheme.colorScheme.inversePrimary
    Canvas(modifier) {
        val r = dotSize.toPx()
        val pad = r * 3
        val minX = cones.minOf { it.x }
        val maxX = cones.maxOf { it.x }
        val minY = cones.minOf { it.y }
        val maxY = cones.maxOf { it.y }
        val scale = min((size.width - 2 * pad) / (maxX - minX), (size.height - 2 * pad) / (maxY - minY))
        val ox = (size.width - (maxX - minX) * scale) / 2 - minX * scale
        val oy = (size.height - (maxY - minY) * scale) / 2 - minY * scale
        val placed = (cones.size * progress).toInt()
        cones.forEachIndexed { i, cone ->
            val p = Offset(ox + cone.x * scale, oy + cone.y * scale)
            val radius = if (cone.color == ConeColor.Orange) r * 1.3f else r
            if (i < placed) drawCircle(cone.color.color, radius, p)
            else drawCircle(missingColor, radius * 0.9f, p, style = Stroke(r * 0.4f))
            if (i == wrongIndex) drawCircle(wrongColor, r * 3.5f, p, style = Stroke(r * 0.5f))
            if (i == currentIndex) drawCircle(currentColor, r * 2f, p)
        }
    }
}

/** Simple traffic-cone drawing, used for the app mark and the AR placeholders. */
fun DrawScope.drawCone(color: Color, topLeft: Offset = Offset.Zero, coneSize: Size = size, alpha: Float = 1f) {
    val w = coneSize.width
    val h = coneSize.height
    val x0 = topLeft.x
    val y0 = topLeft.y
    val baseY = h * 0.88f
    fun left(y: Float) = x0 + w * 0.4f - w * 0.22f * (y / baseY)
    fun right(y: Float) = x0 + w * 0.6f + w * 0.22f * (y / baseY)
    val body = Path().apply {
        moveTo(left(0f), y0); lineTo(right(0f), y0)
        lineTo(right(baseY), y0 + baseY); lineTo(left(baseY), y0 + baseY); close()
    }
    drawPath(body, color, alpha)
    val s0 = h * 0.35f
    val s1 = h * 0.52f
    val stripe = Path().apply {
        moveTo(left(s0), y0 + s0); lineTo(right(s0), y0 + s0)
        lineTo(right(s1), y0 + s1); lineTo(left(s1), y0 + s1); close()
    }
    drawPath(stripe, Color.White, alpha * 0.9f)
    drawRect(Color(0xFF1F2421), Offset(x0 + w * 0.1f, y0 + baseY), Size(w * 0.8f, h * 0.12f), alpha)
}
