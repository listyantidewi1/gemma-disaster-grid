package ai.grg

import android.app.Activity
import android.content.Intent
import android.util.Log
import androidx.activity.result.contract.ActivityResultContract
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanIntentResult
import com.journeyapps.barcodescanner.ScanOptions
import kotlinx.serialization.json.Json

private const val TAG = "QrCodeScanner"

/**
 * Result of scanning a QR code and trying to interpret it as an
 * EdgeTriageReport.
 */
sealed class ScanResult {
    /** Scanner returned a valid EdgeTriageReport JSON. */
    data class Report(val report: EdgeTriageReport) : ScanResult()

    /** Scanner returned text, but it didn't parse as an EdgeTriageReport. */
    data class NotARport(val rawText: String, val reason: String) : ScanResult()

    /** User cancelled the scanner. */
    object Cancelled : ScanResult()
}

/**
 * Thin wrapper around com.journeyapps.barcodescanner.ScanContract.
 *
 * Use from a @Composable like:
 *
 *     val scanLauncher = rememberLauncherForActivityResult(QrCodeScanContract()) {
 *         result -> when (result) { ... }
 *     }
 *     ...
 *     scanLauncher.launch(QrCodeScanContract.defaultOptions())
 *
 * The scanner activity provides its own camera preview UI, torch toggle,
 * and back-button cancellation. We don't need to manage CameraX directly.
 */
class QrCodeScanContract : ActivityResultContract<ScanOptions, ScanResult>() {
    private val inner = ScanContract()

    override fun createIntent(context: android.content.Context, input: ScanOptions): Intent =
        inner.createIntent(context, input)

    override fun parseResult(resultCode: Int, intent: Intent?): ScanResult {
        val raw: ScanIntentResult = inner.parseResult(resultCode, intent)
        val text = raw.contents
        if (resultCode != Activity.RESULT_OK || text.isNullOrBlank()) {
            return ScanResult.Cancelled
        }
        return tryParseReport(text)
    }

    companion object {
        fun defaultOptions(): ScanOptions =
            ScanOptions()
                .setDesiredBarcodeFormats(ScanOptions.QR_CODE)
                .setPrompt("Scan a Gemma Rescue Grid report")
                .setBeepEnabled(false)
                .setOrientationLocked(true)
                .setBarcodeImageEnabled(false)

        private val parserJson = Json {
            ignoreUnknownKeys = true
            isLenient = true
        }

        fun tryParseReport(text: String): ScanResult {
            return try {
                val report =
                    parserJson.decodeFromString<EdgeTriageReport>(text)
                ScanResult.Report(report)
            } catch (e: Exception) {
                Log.w(TAG, "Scanned text didn't parse as EdgeTriageReport", e)
                ScanResult.NotARport(rawText = text.take(160), reason = e.message ?: "parse failed")
            }
        }
    }
}
