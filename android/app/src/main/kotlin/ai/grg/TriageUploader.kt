package ai.grg

import android.util.Log
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private const val TAG = "TriageUploader"

/**
 * Result of an upload attempt. Sealed so the caller can pattern-match
 * on success vs the specific failure mode.
 */
sealed class UploadResult {
    data class Success(val receivedAt: String) : UploadResult()

    /**
     * The server reachable but rejected the upload.
     *  - 401 = bad token
     *  - 422 = schema mismatch
     *  - 5xx = server-side issue
     */
    data class HttpError(val code: Int, val message: String) : UploadResult()

    /** Network unreachable, timeout, DNS failure, etc. */
    data class NetworkError(val message: String) : UploadResult()
}

/**
 * Uploads one EdgeTriageReport to the NusaSiaga dashboard.
 *
 * The phone always succeeds-locally first (the report already rendered
 * on-screen). Upload is best-effort and happens in the background after
 * triage finishes. Caller is responsible for showing the sync-state chip
 * and offering retry on failure.
 */
object TriageUploader {

    private val json = Json {
        encodeDefaults = true
        ignoreUnknownKeys = true
    }

    suspend fun upload(report: EdgeTriageReport): UploadResult =
        withContext(Dispatchers.IO) {
            val body = json.encodeToString(report)
            Log.d(TAG, "POSTing report ${report.reportId} (${body.length} bytes)")

            var connection: HttpURLConnection? = null
            try {
                val url = URL(TriageConfig.INGEST_URL)
                connection = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = TriageConfig.CONNECT_TIMEOUT_MS
                    readTimeout = TriageConfig.READ_TIMEOUT_MS
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    setRequestProperty("X-Triage-Token", TriageConfig.INGEST_TOKEN)
                    setRequestProperty("Accept", "application/json")
                }

                connection.outputStream.use { out ->
                    out.write(body.toByteArray(Charsets.UTF_8))
                }

                val code = connection.responseCode
                val responseBody = readResponseSafely(connection)
                Log.d(TAG, "Response code=$code body=$responseBody")

                if (code in 200..299) {
                    val receivedAt = parseReceivedAt(responseBody) ?: ""
                    UploadResult.Success(receivedAt = receivedAt)
                } else {
                    UploadResult.HttpError(code = code, message = responseBody.take(200))
                }
            } catch (e: IOException) {
                Log.w(TAG, "Network error uploading report", e)
                UploadResult.NetworkError(e.message ?: "Network unreachable")
            } catch (e: Exception) {
                Log.e(TAG, "Unexpected error uploading report", e)
                UploadResult.NetworkError(e.message ?: "Unknown error")
            } finally {
                connection?.disconnect()
            }
        }

    private fun readResponseSafely(conn: HttpURLConnection): String {
        val stream =
            try {
                if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
            } catch (_: Exception) {
                conn.errorStream
            } ?: return ""
        return try {
            stream.bufferedReader(Charsets.UTF_8).use { it.readText() }
        } catch (_: Exception) {
            ""
        }
    }

    private fun parseReceivedAt(body: String): String? {
        if (body.isBlank()) return null
        return try {
            val obj = Json.parseToJsonElement(body)
            obj.takeIf { it is kotlinx.serialization.json.JsonObject }
                ?.let { (it as kotlinx.serialization.json.JsonObject)["received_at"] }
                ?.toString()
                ?.trim('"')
        } catch (_: Exception) {
            null
        }
    }
}
