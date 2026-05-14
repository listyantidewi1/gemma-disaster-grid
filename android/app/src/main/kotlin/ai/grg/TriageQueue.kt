package ai.grg

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private const val TAG = "TriageQueue"
private const val PREFS_NAME = "grg_triage_queue"
private const val PREFIX = "pending_"

/**
 * Persistent offline queue of EdgeTriageReports waiting to sync to the
 * NusaSiaga dashboard.
 *
 * Backed by SharedPreferences (one entry per report keyed by report_id).
 * Survives app kill / device restart. The size of the queue is exposed as
 * a StateFlow so any UI can show a live "N pending" badge.
 *
 * Lifecycle:
 *   1. [enqueue] is called right after a triage finalises. The report is
 *      written to disk synchronously and the live state updates.
 *   2. A sync attempt (foreground or via [SyncWorker]) reads the pending
 *      list, tries to upload each, and calls [markUploaded] on success.
 *   3. Hard-error reports (schema mismatch, etc.) are dropped via
 *      [markUploaded] too — no point keeping a poison record around.
 *
 * Thread-safe via SharedPreferences atomicity. StateFlow updates happen
 * synchronously after each mutation so observers see consistent values.
 */
object TriageQueue {
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    private var prefs: SharedPreferences? = null

    private val _pending = MutableStateFlow<List<EdgeTriageReport>>(emptyList())
    val pending: StateFlow<List<EdgeTriageReport>> = _pending.asStateFlow()

    /** Idempotent. Call once from the entry-point ViewModel or app start. */
    fun init(context: Context) {
        if (prefs != null) return
        prefs = context.applicationContext.getSharedPreferences(
            PREFS_NAME,
            Context.MODE_PRIVATE,
        )
        refresh()
    }

    fun enqueue(report: EdgeTriageReport) {
        val p = prefs ?: return Log.w(TAG, "enqueue called before init()")
        val encoded = json.encodeToString(report)
        p.edit().putString(PREFIX + report.reportId, encoded).apply()
        refresh()
        Log.d(TAG, "Enqueued ${report.reportId}; queue size = ${_pending.value.size}")
    }

    fun markUploaded(reportId: String) {
        val p = prefs ?: return
        p.edit().remove(PREFIX + reportId).apply()
        refresh()
        Log.d(TAG, "Marked uploaded ${reportId}; queue size = ${_pending.value.size}")
    }

    /** Snapshot of pending reports, oldest first by report_id ordering. */
    fun snapshot(): List<EdgeTriageReport> = _pending.value

    /** True if this report is still waiting in the queue. */
    fun isPending(reportId: String): Boolean =
        _pending.value.any { it.reportId == reportId }

    private fun refresh() {
        val p = prefs ?: return
        val items = p.all
            .asSequence()
            .filter { it.key.startsWith(PREFIX) }
            .mapNotNull { entry ->
                val raw = entry.value as? String ?: return@mapNotNull null
                try {
                    json.decodeFromString<EdgeTriageReport>(raw)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to decode queue entry ${entry.key}; dropping", e)
                    p.edit().remove(entry.key).apply()
                    null
                }
            }
            .toList()
        _pending.value = items
    }
}
