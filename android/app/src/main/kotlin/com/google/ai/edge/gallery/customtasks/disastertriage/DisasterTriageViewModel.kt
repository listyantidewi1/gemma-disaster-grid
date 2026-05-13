/*
 * Copyright 2026 Gemma Rescue Grid contributors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 */

package com.google.ai.edge.gallery.customtasks.disastertriage

import ai.grg.EdgeTriageReport
import ai.grg.RoutingContext
import ai.grg.RoutingDecision
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

data class TriageUiState(
  val phase: TriagePhase = TriagePhase.IDLE,
  val capturedBitmap: Bitmap? = null,
  val rawOutput: String = "",
  val report: EdgeTriageReport? = null,
  val routing: RoutingDecision? = null,
  val errorMessage: String? = null,
  val inferenceMs: Long = 0,
)

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

  fun reset() {
    _uiState.value = TriageUiState()
  }

  fun runTriage(model: Model) {
    val bitmap = _uiState.value.capturedBitmap
    if (bitmap == null) {
      Log.w(TAG, "runTriage called without a captured bitmap")
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
      model.runtimeHelper.runInference(
        model = model,
        input = "Triage this scene.",
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
        images = listOf(bitmap),
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
  }
}
