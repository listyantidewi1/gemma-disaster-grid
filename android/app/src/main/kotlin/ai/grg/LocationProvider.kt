package ai.grg

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.location.CurrentLocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull

private const val TAG = "LocationProvider"

/**
 * Best-effort device-location helper for stamping EdgeTriageReports.
 *
 * Returns an empty GrgLocation if anything goes wrong: permission denied,
 * GPS off, no fix obtainable within the timeout, Google Play Services
 * unavailable, etc. Triage never fails because of location.
 */
object LocationProvider {

    /** Total time to wait for a current location fix before giving up. */
    private const val LOCATION_TIMEOUT_MS: Long = 4_000

    fun hasPermission(context: Context): Boolean {
        return ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_COARSE_LOCATION,
            ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Fetch a location to stamp on the report. Two-stage strategy:
     *
     *   1. Ask for the most recent cached fix (lastLocation). Instant if
     *      another app (Maps, weather, etc.) populated it recently.
     *   2. If that's null or stale, request a fresh fix with the balanced
     *      power-accuracy priority and bail after LOCATION_TIMEOUT_MS so
     *      a slow GPS lock doesn't hold up the dashboard upload.
     */
    @SuppressLint("MissingPermission") // checked above
    suspend fun getCurrentLocation(context: Context): GrgLocation {
        if (!hasPermission(context)) {
            Log.d(TAG, "Location permission not granted; returning empty location")
            return GrgLocation()
        }

        return try {
            val client = LocationServices.getFusedLocationProviderClient(context)

            // Stage 1: cached lastLocation.
            val last = suspendCancellableCoroutine<Location?> { cont ->
                client.lastLocation
                    .addOnSuccessListener { cont.resume(it) }
                    .addOnFailureListener { e ->
                        Log.w(TAG, "lastLocation lookup failed", e)
                        cont.resume(null)
                    }
            }
            if (last != null && System.currentTimeMillis() - last.time < 60_000) {
                Log.d(TAG, "Using cached location (${(System.currentTimeMillis() - last.time) / 1000}s old)")
                return last.toGrgLocation()
            }

            // Stage 2: fresh fix with timeout.
            val tokenSource = CancellationTokenSource()
            val fresh = withTimeoutOrNull(LOCATION_TIMEOUT_MS) {
                suspendCancellableCoroutine<Location?> { cont ->
                    val request =
                        CurrentLocationRequest.Builder()
                            .setPriority(Priority.PRIORITY_BALANCED_POWER_ACCURACY)
                            .setMaxUpdateAgeMillis(30_000)
                            .build()
                    client
                        .getCurrentLocation(request, tokenSource.token)
                        .addOnSuccessListener { cont.resume(it) }
                        .addOnFailureListener { e ->
                            Log.w(TAG, "getCurrentLocation failed", e)
                            cont.resume(null)
                        }
                    cont.invokeOnCancellation { tokenSource.cancel() }
                }
            } ?: run {
                tokenSource.cancel()
                Log.d(TAG, "Fresh location timed out after ${LOCATION_TIMEOUT_MS}ms; falling back to last (may be stale)")
                last
            }

            fresh?.toGrgLocation() ?: GrgLocation()
        } catch (e: Exception) {
            Log.w(TAG, "Location fetch threw", e)
            GrgLocation()
        }
    }

    private fun Location.toGrgLocation(): GrgLocation =
        GrgLocation(
            lat = latitude,
            lon = longitude,
            accuracyM = if (hasAccuracy()) accuracy.toDouble() else null,
            label = null,
        )
}
