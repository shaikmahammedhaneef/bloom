package app.bloom.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// The web app's palette (app/globals.css), as Compose colors.
data class BloomColors(
    val dark: Boolean,
    val bg: Color, val surf: Color, val ink: Color, val muted: Color, val line: Color,
    val acc: Color, val onAcc: Color, val accSoft: Color, val accInk: Color, val danger: Color,
    val tones: Map<String, Pair<Color, Color>>,
    val heat: List<Color>,
    val sleep: Color, val steps: Color, val water: Color, val weight: Color,
) {
    fun toneBg(key: String) = (tones[key] ?: tones.getValue("sage")).first
    fun toneFg(key: String) = (tones[key] ?: tones.getValue("sage")).second
}

private fun c(hex: Long) = Color(0xFF000000 or hex)

private val lightTones = mapOf(
    "sky" to (c(0xdceaf5) to c(0x1f4e73)), "sage" to (c(0xddebe4) to c(0x1f4d40)), "peach" to (c(0xf7e2d5) to c(0x8a3e1f)),
    "lilac" to (c(0xe8e3f4) to c(0x463a78)), "honey" to (c(0xfbebc8) to c(0x7a4e0b)), "rose" to (c(0xf6dde4) to c(0x7d2e47)),
)
private val darkTones = mapOf(
    "sky" to (c(0x1e3140) to c(0xa9cdea)), "sage" to (c(0x1f3a32) to c(0xa9dccb)), "peach" to (c(0x3d2a20) to c(0xf2c2a8)),
    "lilac" to (c(0x2d2940) to c(0xcfc6f0)), "honey" to (c(0x3a2e14) to c(0xf2d08a)), "rose" to (c(0x3d2230) to c(0xf0b8c9)),
)

// accent → (acc, onAcc, accSoft, accInk) for light and dark.
private val lightAccents = mapOf(
    "sage" to listOf(c(0x2e6b5a), c(0xffffff), c(0xddebe4), c(0x1f4d40)),
    "peach" to listOf(c(0xb5552e), c(0xffffff), c(0xf7e2d5), c(0x8a3e1f)),
    "lilac" to listOf(c(0x5b4e9a), c(0xffffff), c(0xe8e3f4), c(0x463a78)),
    "ocean" to listOf(c(0x1f5e8c), c(0xffffff), c(0xdceaf5), c(0x1f4e73)),
)
private val darkAccents = mapOf(
    "sage" to listOf(c(0x6fb79f), c(0x0f2a22), c(0x1f3a32), c(0xa9dccb)),
    "peach" to listOf(c(0xe89a76), c(0x3a1a0c), c(0x3d2a20), c(0xf2c2a8)),
    "lilac" to listOf(c(0xa99be6), c(0x1e1640), c(0x2d2940), c(0xcfc6f0)),
    "ocean" to listOf(c(0x7fb6e0), c(0x0b2438), c(0x1e3140), c(0xa9cdea)),
)

fun bloomColors(accent: String, dark: Boolean): BloomColors {
    val a = (if (dark) darkAccents else lightAccents)[accent] ?: (if (dark) darkAccents else lightAccents).getValue("sage")
    return if (!dark) BloomColors(
        false, c(0xf6f2ea), c(0xffffff), c(0x1e1b16), c(0x675f54), c(0xe6dfd2), a[0], a[1], a[2], a[3], c(0xa33a2a), lightTones,
        listOf(c(0xe6dfd2), c(0xc6dfd4), c(0x8fc2ac), c(0x4f977d), c(0x2e6b5a)),
        c(0x5b4e9a), c(0x2e8a5e), c(0x2f7fb8), c(0xb5552e),
    ) else BloomColors(
        true, c(0x15171a), c(0x1f2226), c(0xf1eee8), c(0xa8a298), c(0x33373c), a[0], a[1], a[2], a[3], c(0xf08a78), darkTones,
        listOf(c(0x2a2d31), c(0x1f3a32), c(0x2f6653), c(0x4f977d), c(0x8fd0b7)),
        c(0x8a7be0), c(0x3fa674), c(0x439cd6), c(0xd47344),
    )
}

val LocalBloom = staticCompositionLocalOf { bloomColors("sage", false) }

private val Serif = FontFamily.Serif
private val base = Typography()
private val typography = Typography(
    headlineLarge = base.headlineLarge.copy(fontFamily = Serif, fontWeight = FontWeight.SemiBold),
    headlineMedium = base.headlineMedium.copy(fontFamily = Serif, fontWeight = FontWeight.SemiBold),
    headlineSmall = base.headlineSmall.copy(fontFamily = Serif, fontWeight = FontWeight.SemiBold),
    titleLarge = base.titleLarge.copy(fontFamily = Serif, fontWeight = FontWeight.SemiBold),
    titleMedium = base.titleMedium.copy(fontWeight = FontWeight.SemiBold),
    labelLarge = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.Medium),
)

@Composable
fun BloomTheme(accent: String, theme: String, content: @Composable () -> Unit) {
    val dark = when (theme) { "dark" -> true; "light" -> false; else -> isSystemInDarkTheme() }
    val b = bloomColors(accent, dark)
    val scheme = if (dark) darkColorScheme(
        primary = b.acc, onPrimary = b.onAcc, primaryContainer = b.accSoft, onPrimaryContainer = b.accInk,
        secondaryContainer = b.accSoft, onSecondaryContainer = b.accInk,
        background = b.bg, onBackground = b.ink, surface = b.bg, onSurface = b.ink, onSurfaceVariant = b.muted,
        surfaceContainer = b.surf, surfaceContainerLow = b.surf, surfaceContainerHigh = b.surf, surfaceContainerHighest = b.line,
        outline = b.muted, outlineVariant = b.line, error = b.danger,
    ) else lightColorScheme(
        primary = b.acc, onPrimary = b.onAcc, primaryContainer = b.accSoft, onPrimaryContainer = b.accInk,
        secondaryContainer = b.accSoft, onSecondaryContainer = b.accInk,
        background = b.bg, onBackground = b.ink, surface = b.bg, onSurface = b.ink, onSurfaceVariant = b.muted,
        surfaceContainer = b.surf, surfaceContainerLow = b.surf, surfaceContainerHigh = b.surf, surfaceContainerHighest = b.line,
        outline = b.muted, outlineVariant = b.line, error = b.danger,
    )
    CompositionLocalProvider(LocalBloom provides b) {
        MaterialTheme(colorScheme = scheme, typography = typography, content = content)
    }
}
