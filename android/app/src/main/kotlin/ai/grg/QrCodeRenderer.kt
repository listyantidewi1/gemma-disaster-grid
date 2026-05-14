package ai.grg

import android.graphics.Bitmap
import android.graphics.Color
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.MultiFormatWriter
import com.google.zxing.WriterException
import com.google.zxing.common.BitMatrix
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Phone-to-phone "mesh by line-of-sight": render any EdgeTriageReport as
 * a scannable QR code so an offline responder can hand off a report to a
 * nearby phone without any radio, network, or Bluetooth pairing.
 *
 * Encoding strategy:
 *  - Serialize the report as compact JSON (the same JSON the dashboard
 *    consumes, so a receiving phone can parseEdgeReport() it back).
 *  - QR Level M error correction. Survives ~15% damage / glare / partial
 *    occlusion. Level L would be smaller but less robust in the field.
 *  - 1 px / module margin (4 modules is QR spec; the embedded zxing
 *    scanner is tolerant of less).
 *
 * Typical EdgeTriageReport JSON: 600-1200 bytes. That fits comfortably
 * in a Version 20-30 QR. Modern phone cameras decode V30 reliably from
 * ~30 cm with the screen at full brightness.
 */
object QrCodeRenderer {

    private val json = Json {
        encodeDefaults = true
        ignoreUnknownKeys = true
    }

    /** Serialize a report and return its QR encoding as a [Bitmap]. */
    fun encodeReport(report: EdgeTriageReport, sizePx: Int = 720): Bitmap {
        val payload = json.encodeToString(report)
        return encodeText(payload, sizePx)
    }

    /** Generic text → QR bitmap. Used by encodeReport; also handy for
     *  debugging (encode any string to verify the scanner round-trips). */
    fun encodeText(text: String, sizePx: Int = 720): Bitmap {
        val hints =
            mapOf(
                EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M,
                EncodeHintType.MARGIN to 1,
                EncodeHintType.CHARACTER_SET to "UTF-8",
            )
        val matrix: BitMatrix =
            try {
                MultiFormatWriter()
                    .encode(text, BarcodeFormat.QR_CODE, sizePx, sizePx, hints)
            } catch (e: WriterException) {
                // Fall back to a 1x1 white pixel so the caller doesn't have
                // to special-case nulls. The UI should bail before this in
                // practice (we only call encode after a successful triage).
                return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888).also {
                    it.setPixel(0, 0, Color.WHITE)
                }
            }

        val width = matrix.width
        val height = matrix.height
        val pixels = IntArray(width * height)
        for (y in 0 until height) {
            val offset = y * width
            for (x in 0 until width) {
                pixels[offset + x] = if (matrix[x, y]) Color.BLACK else Color.WHITE
            }
        }
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        bitmap.setPixels(pixels, 0, width, 0, 0, width, height)
        return bitmap
    }
}
