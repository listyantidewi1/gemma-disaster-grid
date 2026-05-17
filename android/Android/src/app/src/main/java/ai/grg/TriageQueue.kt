package ai.grg

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private const val TAG = "TriageQueue"
private const val PREFS_NAME = "grg_triage_queue"
private const val PREFIX = "report_"

/** Where the locally-held copy of this report came from. */
@Serializable
enum class ReportSource {
    /** Triaged on THIS phone by THIS user. */
    SELF,

    /** Scanned in from another responder's QR code. */
    QR,

    /** Received via Android share-intent (ACTION_SEND). */
    SHARE,
}

/** Lifecycle status of the locally-held copy of the report. */
@Serializable
enum class ReportSyncStatus {
    /** Not yet uploaded to the dashboard. The sync worker will retry. */
    PENDING,

    /** Successfully uploaded to the dashboard at least once. */
    SYNCED,

    /** Marked as resolved/ended by this user. PATCH may or may not have
     *  reached the server yet — `serverConfirmedResolution` tracks that. */
    ENDED,
}

/**
 * One entry in the local persistent store. Survives app kill and
 * device restart. The `report` is the immutable Gemma-produced
 * EdgeTriageReport; everything else is local bookkeeping that the
 * UI and the sync worker mutate as upload / resolve events happen.
 */
@Serializable
data class LocalReport(
    val report: EdgeTriageReport,
    val source: ReportSource,
    val status: ReportSyncStatus = ReportSyncStatus.PENDING,
    /** ISO timestamp this row was created on THIS phone. Different from
     *  report.timestamp_iso (which is when triage finished — same value
     *  for self-triages, different for QR/share imports). */
    val capturedAt: String,
    /** ISO timestamp of the most recent successful upload. */
    val uploadedAt: String? = null,
    /** ISO timestamp at which this user marked the report resolved.
     *  Independent of the server's _resolved_at — that one wins in the
     *  dashboard's eyes; this is just for local UI. */
    val endedAt: String? = null,
    /** Did the server confirm the PATCH-to-resolve? False until the
     *  PATCH succeeds. Allows the UI to show "Resolved (sync pending)". */
    val serverConfirmedResolution: Boolean = false,
)

/**
 * Persistent offline-first store of EdgeTriageReports the user has
 * encountered on this phone, whether self-triaged or imported via QR /
 * share. Backed by SharedPreferences (one entry per report keyed by
 * report_id) for kill-safety. Exposes a StateFlow of every row so the
 * UI's "Recent reports" view can render live.
 *
 * Reports are NEVER auto-deleted; status flips between PENDING / SYNCED
 * / ENDED as events happen. Explicit clearing is a user action (not
 * shipped in v1).
 */
object TriageQueue {
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    private var prefs: SharedPreferences? = null

    private val _all = MutableStateFlow<List<LocalReport>>(emptyList())

    /** Every locally-stored report, newest capturedAt first. */
    val all: StateFlow<List<LocalReport>> = _all.asStateFlow()

    /** Subset that still needs to upload to the dashboard. */
    val pending: StateFlow<List<LocalReport>> = _all.asStateFlow().let {
        MutableStateFlow(_all.value.filter { lr -> lr.status == ReportSyncStatus.PENDING })
            .also { mf ->
                // Hand-rolled derived flow without coroutines/CoroutineScope plumbing.
                // refresh() updates both _all and this flow synchronously.
                _pending = mf
            }
    }

    private lateinit var _pending: MutableStateFlow<List<LocalReport>>

    /** Idempotent. Call once from the ViewModel/Application before use. */
    fun init(context: Context) {
        if (prefs != null) return
        prefs = context.applicationContext.getSharedPreferences(
            PREFS_NAME,
            Context.MODE_PRIVATE,
        )
        refresh()
    }

    /** Add a freshly-triaged or freshly-imported report as PENDING. If a
     *  row with the same report_id already exists (e.g. the user scanned
     *  a QR for a report they already had), we update its source if more
     *  authoritative and otherwise leave it alone. */
    fun enqueue(report: EdgeTriageReport, source: ReportSource = ReportSource.SELF) {
        val p = prefs
        if (p == null) {
            Log.w(TAG, "enqueue called before init()")
            return
        }
        val existingRaw = p.getString(PREFIX + report.reportId, null)
        val capturedAt = java.time.Instant.now().toString()
        val toStore =
            if (existingRaw != null) {
                // Already in the store — preserve status & timestamps. Don't
                // downgrade SELF to QR if we're re-seeing it as a QR scan.
                val existing = decode(existingRaw) ?: return
                if (existing.source == ReportSource.QR && source == ReportSource.SELF) {
                    existing.copy(source = source)
                } else {
                    existing
                }
            } else {
                LocalReport(
                    report = report,
                    source = source,
                    status = ReportSyncStatus.PENDING,
                    capturedAt = capturedAt,
                )
            }
        p.edit().putString(PREFIX + report.reportId, json.encodeToString(toStore)).apply()
        refresh()
        Log.d(TAG, "Enqueued ${report.reportId} (source=$source); total=${_all.value.size}")
    }

    /** Flip status to SYNCED after a successful POST. No-op if absent. */
    fun markSynced(reportId: String) {
        mutate(reportId) {
            it.copy(
                status = if (it.status == ReportSyncStatus.ENDED) it.status else ReportSyncStatus.SYNCED,
                uploadedAt = java.time.Instant.now().toString(),
            )
        }
    }

    /** Mark resolved locally. The PATCH that confirms it server-side is
     *  separate; call markServerConfirmedResolution once that round-trips. */
    fun markEnded(reportId: String) {
        mutate(reportId) {
            it.copy(
                status = ReportSyncStatus.ENDED,
                endedAt = java.time.Instant.now().toString(),
            )
        }
    }

    fun markServerConfirmedResolution(reportId: String) {
        mutate(reportId) { it.copy(serverConfirmedResolution = true) }
    }

    /**
     * Drop a row entirely. Currently only used by the legacy syncer when
     * a 4xx schema error makes the row a poison record. Most lifecycle
     * transitions use markX above instead so the user keeps the history.
     */
    fun forget(reportId: String) {
        val p = prefs ?: return
        p.edit().remove(PREFIX + reportId).apply()
        refresh()
    }

    /** True if this report_id is in the store, regardless of status. */
    fun contains(reportId: String): Boolean = _all.value.any { it.report.reportId == reportId }

    /** Snapshot — every pending row, newest first. Sync worker iterates this. */
    fun pendingSnapshot(): List<LocalReport> = _pending.value

    /** Snapshot — every locally-held row, newest first. UI iterates this. */
    fun allSnapshot(): List<LocalReport> = _all.value

    private fun mutate(reportId: String, transform: (LocalReport) -> LocalReport) {
        val p = prefs ?: return
        val existingRaw = p.getString(PREFIX + reportId, null) ?: return
        val existing = decode(existingRaw) ?: return
        val updated = transform(existing)
        p.edit().putString(PREFIX + reportId, json.encodeToString(updated)).apply()
        refresh()
    }

    private fun decode(raw: String): LocalReport? =
        try {
            json.decodeFromString<LocalReport>(raw)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to decode stored row; dropping", e)
            null
        }

    private fun refresh() {
        val p = prefs ?: return
        val items = p.all
            .asSequence()
            .filter { it.key.startsWith(PREFIX) }
            .mapNotNull { entry ->
                val raw = entry.value as? String ?: return@mapNotNull null
                decode(raw) ?: run {
                    p.edit().remove(entry.key).apply()
                    null
                }
            }
            .sortedByDescending { it.capturedAt }
            .toList()
        _all.value = items
        if (::_pending.isInitialized) {
            _pending.value = items.filter { it.status == ReportSyncStatus.PENDING }
        }
    }
}
