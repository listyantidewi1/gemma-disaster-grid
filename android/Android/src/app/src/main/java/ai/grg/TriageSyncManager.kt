package ai.grg

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.util.Log
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

private const val TAG = "TriageSyncManager"
private const val UNIQUE_NOW = "grg-triage-sync-now"
private const val UNIQUE_PERIODIC = "grg-triage-sync-periodic"
private const val PERIODIC_INTERVAL_MIN: Long = 30

/**
 * Result of one drain pass through the queue.
 * @param uploaded reports that successfully POSTed
 * @param dropped reports that hit a hard schema/auth error and were removed
 * @param stillQueued reports left in the queue (network blip, server 5xx)
 */
data class SyncResult(
    val uploaded: Int,
    val dropped: Int,
    val stillQueued: Int,
)

/**
 * Orchestrates the offline-first sync loop:
 *
 *   - [syncOnce]: pull every pending EdgeTriageReport off [TriageQueue],
 *     try to upload, classify the outcome, remove from queue if success
 *     or hard failure. Safe to call from foreground (after a triage) or
 *     from background ([SyncWorker]).
 *
 *   - [scheduleBackgroundSync]: enqueue both an expedited one-time job
 *     (for snappy first-try) and a periodic catch-up job (every 30 min)
 *     with a NetworkType.CONNECTED constraint. Idempotent — calling on
 *     every triage is fine, the unique-work policies dedupe.
 *
 *   - [registerConnectivityCallback]: hook a [ConnectivityManager.NetworkCallback]
 *     that drains the queue the moment a usable network reappears. Caller
 *     is responsible for the lifecycle (returns an unregister lambda).
 */
object TriageSyncManager {

    /**
     * Internal scope for the connectivity-callback-driven drain. Survives
     * the screen lifecycle so a reappearing network can still upload
     * pending reports while the user is on a different screen. NOT used
     * for foreground sync triggered by the ViewModel — those go on the
     * ViewModel's own scope.
     */
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    suspend fun syncOnce(): SyncResult {
        val pending = TriageQueue.pendingSnapshot()
        if (pending.isEmpty()) return SyncResult(0, 0, 0)

        var uploaded = 0
        var dropped = 0
        for (local in pending) {
            val report = local.report
            when (val result = TriageUploader.upload(report)) {
                is UploadResult.Success -> {
                    // Doesn't remove — flips status to SYNCED so the user
                    // can still see the row in their Recent reports list.
                    TriageQueue.markSynced(report.reportId)
                    uploaded++
                }

                is UploadResult.HttpError -> {
                    if (result.code in listOf(400, 401, 403, 422)) {
                        // Hard error — retrying won't help. Drop the row
                        // entirely so we don't loop forever on a poison
                        // record and so it doesn't clutter Recent reports.
                        Log.w(
                            TAG,
                            "Dropping ${report.reportId} from queue: ${result.code} ${result.message}",
                        )
                        TriageQueue.forget(report.reportId)
                        dropped++
                    }
                    // 5xx: leave in queue for the next drain. Don't try
                    // the remaining ones either — server is unhappy.
                    if (result.code >= 500) break
                }

                is UploadResult.NetworkError -> {
                    // Network is unreachable. No point hammering the rest;
                    // wait for the connectivity callback to wake us up.
                    Log.d(TAG, "Network error on ${report.reportId}; bailing this pass")
                    break
                }
            }
        }
        val stillQueued = TriageQueue.pendingSnapshot().size
        Log.d(TAG, "syncOnce: uploaded=$uploaded dropped=$dropped stillQueued=$stillQueued")
        return SyncResult(uploaded = uploaded, dropped = dropped, stillQueued = stillQueued)
    }

    fun scheduleBackgroundSync(context: Context) {
        val constraints =
            Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

        // Expedited one-shot: runs as soon as the OS allows, gets foreground-
        // adjacent priority. If the OS denies expedited quota, it falls back
        // to standard scheduling.
        val now =
            OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork(UNIQUE_NOW, ExistingWorkPolicy.REPLACE, now)

        // Periodic catch-up: 30 minutes is comfortably above WorkManager's
        // 15-minute minimum interval and gentle on the battery. The KEEP
        // policy means calling this on every triage is a no-op once the
        // periodic work is already scheduled.
        val periodic =
            PeriodicWorkRequestBuilder<SyncWorker>(
                    repeatInterval = PERIODIC_INTERVAL_MIN,
                    repeatIntervalTimeUnit = TimeUnit.MINUTES,
                )
                .setConstraints(constraints)
                .build()
        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(
                UNIQUE_PERIODIC,
                ExistingPeriodicWorkPolicy.KEEP,
                periodic,
            )
    }

    /**
     * Register a NetworkCallback that drains the queue the moment a usable
     * network appears. Returns an unregister lambda the caller invokes on
     * disposal (e.g. from a Compose DisposableEffect).
     */
    fun registerConnectivityCallback(context: Context): () -> Unit {
        val cm =
            context.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE)
                as? ConnectivityManager ?: return {}

        val callback =
            object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    Log.d(TAG, "Network available; draining queue")
                    scope.launch { syncOnce() }
                }
            }
        val request =
            NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .addCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
                .build()
        try {
            cm.registerNetworkCallback(request, callback)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to register network callback", e)
            return {}
        }
        return {
            try {
                cm.unregisterNetworkCallback(callback)
            } catch (_: Exception) {
                // Already unregistered or system unstable; ignore.
            }
        }
    }
}
