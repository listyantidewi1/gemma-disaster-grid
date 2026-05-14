/*
 * Copyright 2026 Gemma Rescue Grid contributors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 */

package com.google.ai.edge.gallery.customtasks.disastertriage

import ai.grg.EdgeTriageReport
import ai.grg.RoutingContext
import ai.grg.RoutingDecision
import ai.grg.TriageUploader
import ai.grg.UploadResult
import ai.grg.decideRouting
import ai.grg.parseEdgeReport
import android.graphics.Bitmap
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.ai.edge.gallery.data.Model
import com.google.ai.edge.gallery.runtime.runtimeHelper
import dagger.hilt.android.lifecycle.HiltViewModel
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
  /** Last upload failed; the user can retry. */
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
class DisasterTriageViewModel @Inject constructor() : ViewModel() {
  private val _uiState = MutableStateFlow(TriageUiState())
  val uiState = _uiState.asStateFlow()

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
    val enriched =
      parsed.copy(
        reportId = "edge-${UUID.randomUUID()}",
        timestampIso = Instant.now().toString(),
      )
    val routing =
      decideRouting(
        report = enriched,
        context =
          RoutingContext(
            connectivityOnline = false,
            recentReportsSameArea60min = 0,
            queueDepth = 0,
            batteryPercent = 100,
          ),
      )
    _uiState.update {
      it.copy(
        phase = TriagePhase.RESULT,
        rawOutput = raw,
        report = enriched,
        routing = routing,
        inferenceMs = elapsedMs,
        errorMessage = null,
      )
    }

    // Auto-fire a sync attempt. Result is reflected in uiState.sync; failures
    // are non-blocking — the report is already rendered locally either way.
    uploadReport(enriched)
  }

  /**
   * POST the given report to the NusaSiaga dashboard via TriageUploader.
   * Updates uiState.sync as the request progresses. Safe to call from
   * the auto-fire path after a successful triage, or from the retry button.
   */
  fun uploadReport(report: EdgeTriageReport) {
    _uiState.update { it.copy(sync = SyncState.Syncing) }
    viewModelScope.launch(Dispatchers.IO) {
      val result = TriageUploader.upload(report)
      _uiState.update {
        it.copy(
          sync =
            when (result) {
              is UploadResult.Success ->
                SyncState.Synced(receivedAt = result.receivedAt)
              is UploadResult.HttpError ->
                SyncState.Failed("Server error ${result.code}: ${result.message}")
              is UploadResult.NetworkError ->
                SyncState.Failed("Offline or network error: ${result.message}")
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
