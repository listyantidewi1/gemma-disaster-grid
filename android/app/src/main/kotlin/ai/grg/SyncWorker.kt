package ai.grg

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

private const val TAG = "GrgSyncWorker"

/**
 * Background drains of [TriageQueue], scheduled by [TriageSyncManager].
 * Plain CoroutineWorker (not @HiltWorker) so it can be instantiated by
 * the default WorkManager initializer without any extra app-wide
 * factory plumbing.
 *
 *   - Result.success() when the queue is empty after the drain (nothing
 *     more to do).
 *   - Result.retry() when items remain (transient errors); WorkManager
 *     will reschedule with exponential backoff against the
 *     NetworkType.CONNECTED constraint.
 *   - Result.failure() only on a re-throwable exception, which should
 *     never happen given TriageSyncManager swallows all upload errors.
 */
class SyncWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            // The queue is normally init'd by the ViewModel on first triage,
            // but a worker run from a freshly-cold process won't have that
            // ViewModel constructed. Init defensively.
            TriageQueue.init(applicationContext)
            val result = TriageSyncManager.syncOnce()
            Log.d(
                TAG,
                "drain done: uploaded=${result.uploaded} dropped=${result.dropped} stillQueued=${result.stillQueued}",
            )
            if (result.stillQueued == 0) Result.success() else Result.retry()
        } catch (e: Exception) {
            Log.e(TAG, "Worker threw", e)
            Result.retry()
        }
    }
}
