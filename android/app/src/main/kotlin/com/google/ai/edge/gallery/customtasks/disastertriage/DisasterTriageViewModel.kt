/*
 * Copyright 2026 Gemma Rescue Grid contributors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 */

package com.google.ai.edge.gallery.customtasks.disastertriage

import ai.grg.EdgeTriageReport
import ai.grg.LocationProvider
import ai.grg.RoutingContext
import ai.grg.RoutingDecision
import ai.grg.TriageQueue
import ai.grg.TriageSyncManager
import ai.grg.TriageUploader
import ai.grg.UploadResult
import ai.grg.decideRouting
import ai.grg.parseEdgeReport
import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.ai.edge.gallery.data.Model
import com.google.ai.edge.gallery.runtime.runtimeHelper
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import java.time.Instant
import java.util.UUID
import javax.inject.Inject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private const val TAG = "DisasterTriageVM"

/** Where in the triage flow are we right now. */
enum class TriagePhase {
  IDLE,
  CAPTURED,
  INFERRING,
  RESULT,
  ERROR,
}

/** Where the dashboard-sync attempt for the current report stands. */
sealed class SyncState {
  /** No upload has been attempted (no report yet, or reset). */
  object Idle : SyncState()
  /** Upload is in flight. */
  object Syncing : SyncState()
  /** Successful POST; dashboard acknowledged at [receivedAt] (ISO timestamp). */
  data class Synced(val receivedAt: String) : SyncState()
  /**
   * Couldn't reach the dashboard right now; the report is safely persisted
   * in [TriageQueue] and will retry automatically via the connectivity
   * callback or the periodic WorkManager job. The user can also tap retry.
   */
  data class Queued(val reason: String) : SyncState()
  /**
   * Hard failure (schema mismatch, 4xx auth) that won't be helped by a
   * retry. Report is dropped from the queue. User can retry manually.
   */
  data class Failed(val message: String) : SyncState()
}

data class TriageUiState(
  val phase: TriagePhase = TriagePhase.IDLE,
  val capturedBitmap: Bitmap? = null,
  val capturedAudio: ByteArray? = null,
  val audioDurationMs: Long = 0,
  val isRecording: Boolean = false,
  val recordingElapsedMs: Long = 0,
  val rawOutput: String = "",
  val report: EdgeTriageReport? = null,
  val routing: RoutingDecision? = null,
  val errorMessage: String? = null,
  val inferenceMs: Long = 0,
  val sync: SyncState = SyncState.Idle,
) {
  /** Triage can run if we have a photo, an audio clip, or both. */
  val canTriage: Boolean
    get() = capturedBitmap != null || capturedAudio != null
}

@HiltViewModel
class DisasterTriageViewModel
@Inject
constructor(@ApplicationContext private val appContext: Context) : ViewModel() {
  private val _uiState = MutableStateFlow(TriageUiState())
  val uiState = _uiState.asStateFlow()

  /** Live pending-report queue size; consumed by the header pill in the UI. */
  val pendingQueue = TriageQueue.pending

  init {
    // Eagerly initialise the persistent queue and kick a drain in case the
    // app was killed last time with pending reports. Background WorkManager
    // jobs will also keep draining when the user isn't on this screen.
    TriageQueue.init(appContext)
    viewModelScope.launch(Dispatchers.IO) {
      TriageSyncManager.syncOnce()
      TriageSyncManager.scheduleBackgroundSync(appContext)
    }
  }

  fun onPhotoCaptured(bitmap: Bitmap) {
    _uiState.update {
      it.copy(
        phase = TriagePhase.CAPTURED,
        capturedBitmap = bitmap,
        rawOutput = "",
        report = null,
        routing = null,
        errorMessage = null,
        inferenceMs = 0,
      )
    }
  }

  fun clearPhoto() {
    _uiState.update {
      val next = it.copy(capturedBitmap = null)
      next.copy(phase = if (next.canTriage) TriagePhase.CAPTURED else TriagePhase.IDLE)
    }
  }

  fun onAudioCaptured(audioBytes: ByteArray, durationMs: Long) {
    _uiState.update {
      it.copy(
        phase = TriagePhase.CAPTURED,
        capturedAudio = audioBytes,
        audioDurationMs = durationMs,
        isRecording = false,
        recordingElapsedMs = 0,
        rawOutput = "",
        report = null,
        routing = null,
        errorMessage = null,
        inferenceMs = 0,
      )
    }
  }

  fun clearAudio() {
    _uiState.update {
      val next = it.copy(capturedAudio = null, audioDurationMs = 0)
      next.copy(phase = if (next.canTriage) TriagePhase.CAPTURED else TriagePhase.IDLE)
    }
  }

  fun setRecording(recording: Boolean, elapsedMs: Long = 0) {
    _uiState.update { it.copy(isRecording = recording, recordingElapsedMs = elapsedMs) }
  }

  fun reset() {
    _uiState.value = TriageUiState()
  }

  fun runTriage(model: Model) {
    val state = _uiState.value
    val bitmap = state.capturedBitmap
    val audio = state.capturedAudio
    if (bitmap == null && audio == null) {
      Log.w(TAG, "runTriage called with neither photo nor audio")
      return
    }
    if (model.instance == null) {
      _uiState.update {
        it.copy(phase = TriagePhase.ERROR, errorMessage = "Model not loaded yet")
      }
      return
    }

    _uiState.update { it.copy(phase = TriagePhase.INFERRING, rawOutput = "") }
    val startMs = System.currentTimeMillis()

    viewModelScope.launch(Dispatchers.Default) {
      val buf = StringBuilder()
      val promptText =
        when {
          bitmap != null && audio != null -> "Triage this scene using the photo and the voice note."
          bitmap != null -> "Triage this scene."
          else -> "Triage this scene based on my voice note."
        }
      model.runtimeHelper.runInference(
        model = model,
        input = promptText,
        resultListener = { partial, done, _ ->
          if (partial.isNotEmpty()) {
            buf.append(partial)
            _uiState.update { it.copy(rawOutput = buf.toString()) }
          }
          if (done) {
            finalize(buf.toString(), System.currentTimeMillis() - startMs)
          }
        },
        cleanUpListener = { /* no-op */ },
        onError = { message ->
          Log.e(TAG, "Inference error: $message")
          _uiState.update {
            it.copy(phase = TriagePhase.ERROR, errorMessage = message)
          }
        },
        images = if (bitmap != null) listOf(bitmap) else emptyList(),
        audioClips = if (audio != null) listOf(audio) else emptyList(),
      )
    }
  }

  private fun finalize(raw: String, elapsedMs: Long) {
    val (parsed, error) = parseEdgeReport(raw)
    if (parsed == null) {
      _uiState.update {
        it.copy(
          phase = TriagePhase.ERROR,
          rawOutput = raw,
          errorMessage = error ?: "Parse failed",
          inferenceMs = elapsedMs,
        )
      }
      return
    }

    val baseEnriched =
      parsed.copy(
        reportId = "edge-${UUID.randomUUID()}",
        timestampIso = Instant.now().toString(),
      )
    val routing =
      decideRouting(
        report = baseEnriched,
        context =
          RoutingContext(
            connectivityOnline = false,
            recentReportsSameArea60min = 0,
            queueDepth = 0,
            batteryPercent = 100,
          ),
      )

    // Render the result card immediately with what we have. Location and
    // upload happen async so a slow GPS fix never blocks the UI.
    _uiState.update {
      it.copy(
        phase = TriagePhase.RESULT,
        rawOutput = raw,
        report = baseEnriched,
        routing = routing,
        inferenceMs = elapsedMs,
        errorMessage = null,
      )
    }

    // Fetch GPS, stamp it on the report, then upload. Worst case (denied
    // permission / slow GPS / no fix) we upload with an empty location and
    // the dashboard map skips the pin — the card itself still appears.
    viewModelScope.launch(Dispatchers.IO) {
      val location = LocationProvider.getCurrentLocation(appContext)
      val stamped = baseEnriched.copy(location = location)
      _uiState.update { it.copy(report = stamped) }
      uploadReport(stamped)
    }
  }

  /**
   * Persist the report in the offline queue, then attempt an immediate
   * upload. Three outcomes:
   *
   *  - Success: queue entry is removed, uiState.sync = Synced.
   *  - Network error: report stays in the queue, uiState.sync = Queued.
   *    The connectivity callback or the periodic WorkManager job will
   *    drain it when the radio comes back.
   *  - Hard server error (4xx): queue entry is removed (no point keeping
   *    a poison record), uiState.sync = Failed. User can retry manually.
   *
   * The background sync is scheduled unconditionally so newly-pending
   * reports get picked up even after the user closes the app.
   */
  fun uploadReport(report: EdgeTriageReport) {
    _uiState.update { it.copy(sync = SyncState.Syncing) }
    // Enqueue first so a process kill mid-upload doesn't lose the report.
    TriageQueue.enqueue(report)
    TriageSyncManager.scheduleBackgroundSync(appContext)

    viewModelScope.launch(Dispatchers.IO) {
      val result = TriageUploader.upload(report)
      _uiState.update {
        it.copy(
          sync =
            when (result) {
              is UploadResult.Success -> {
                TriageQueue.markUploaded(report.reportId)
                SyncState.Synced(receivedAt = result.receivedAt)
              }
              is UploadResult.HttpError -> {
                if (result.code in listOf(400, 401, 403, 422)) {
                  // Hard error: drop from queue, surface to user.
                  TriageQueue.markUploaded(report.reportId)
                  SyncState.Failed("Server rejected (${result.code}): ${result.message}")
                } else {
                  // Transient 5xx: leave queued, retry in background.
                  SyncState.Queued("Server is busy (${result.code}) — will retry when reachable")
                }
              }
              is UploadResult.NetworkError ->
                SyncState.Queued("Offline — report saved and will sync when connectivity returns")
            }
        )
      }
    }
  }

  /** Manual retry from the result-card retry button. */
  fun retrySync() {
    val report = _uiState.value.report ?: return
    uploadReport(report)
  }
}
