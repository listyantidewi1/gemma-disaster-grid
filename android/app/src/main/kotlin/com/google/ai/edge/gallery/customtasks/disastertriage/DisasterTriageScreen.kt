/*
 * Copyright 2026 Gemma Rescue Grid contributors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 */

package com.google.ai.edge.gallery.customtasks.disastertriage

import ai.grg.DisasterType
import ai.grg.EdgeTriageReport
import ai.grg.EvacuationPriority
import ai.grg.QrCodeRenderer
import ai.grg.QrCodeScanContract
import ai.grg.RoutingDecision
import ai.grg.RoutingRecommendation
import ai.grg.ScanResult
import ai.grg.TriageQueue
import ai.grg.TriageSyncManager
import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Camera
import androidx.compose.material.icons.outlined.CloudDone
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.CloudQueue
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.QrCode
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Stop
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.google.ai.edge.gallery.ui.modelmanager.ModelManagerViewModel
import java.io.ByteArrayOutputStream
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val TAG = "DisasterTriageScreen"

// LiteRT-LM expects 16 kHz mono PCM 16-bit, matching the gallery's
// AudioRecorderPanel constants (Consts.kt::SAMPLE_RATE = 16000).
private const val AUDIO_SAMPLE_RATE = 16000
private const val AUDIO_CHANNEL = AudioFormat.CHANNEL_IN_MONO
private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT

// Cap recordings so a stuck mic doesn't drain the battery and so
// inference latency stays bounded on mid-range hardware.
private const val MAX_RECORDING_SEC = 30

@Composable
fun DisasterTriageScreen(
  modelManagerViewModel: ModelManagerViewModel,
  viewModel: DisasterTriageViewModel = hiltViewModel(),
) {
  val modelManagerUiState by modelManagerViewModel.uiState.collectAsState()
  val uiState by viewModel.uiState.collectAsState()
  val model = modelManagerUiState.selectedModel
  val isModelReady = modelManagerUiState.isModelInitialized(model = model)
  val context = LocalContext.current
  val coroutineScope = rememberCoroutineScope()

  // Permissions.
  var hasCameraPermission by remember {
    mutableStateOf(
      ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
        PackageManager.PERMISSION_GRANTED
    )
  }
  var hasMicPermission by remember {
    mutableStateOf(
      ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
        PackageManager.PERMISSION_GRANTED
    )
  }
  var hasLocationPermission by remember {
    mutableStateOf(
      ContextCompat.checkSelfPermission(
        context, Manifest.permission.ACCESS_FINE_LOCATION,
      ) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(
          context, Manifest.permission.ACCESS_COARSE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
    )
  }
  val cameraPermLauncher =
    rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
      hasCameraPermission = granted
    }
  val micPermLauncher =
    rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
      hasMicPermission = granted
    }
  val locationPermLauncher =
    rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
      hasLocationPermission = granted
    }

  // Camera launcher.
  val cameraLauncher =
    rememberLauncherForActivityResult(ActivityResultContracts.TakePicturePreview()) { bitmap ->
      if (bitmap != null) viewModel.onPhotoCaptured(bitmap)
    }

  // Audio recording state (lives in the composable so AudioRecord can be
  // released cleanly on dispose).
  val audioRecordRef = remember { mutableStateOf<AudioRecord?>(null) }
  val audioStreamRef = remember { ByteArrayOutputStream() }
  val recordingJobRef = remember { mutableStateOf<Job?>(null) }

  DisposableEffect(Unit) {
    onDispose {
      stopRecording(audioRecordRef, audioStreamRef, recordingJobRef)
    }
  }

  // Drain pending reports the moment the radio comes back. Lifecycle is
  // scoped to this screen — when the user navigates away, we unregister.
  // The periodic WorkManager job keeps things flowing in the background.
  DisposableEffect(Unit) {
    val unregister = TriageSyncManager.registerConnectivityCallback(context)
    onDispose { unregister() }
  }

  // Live pending-queue size, for the header pill below.
  val pendingReports by viewModel.pendingQueue.collectAsState()

  // QR-mesh scanner. The launcher takes a ScanOptions and returns our
  // sealed ScanResult; on success we enqueue the imported report into the
  // local queue + schedule a background sync. This is how a phone with no
  // connectivity hands a report to another phone (the other phone scans
  // this one's screen) without any radio or pairing.
  var scanFeedback by remember { mutableStateOf<String?>(null) }
  val scanLauncher =
    rememberLauncherForActivityResult(QrCodeScanContract()) { result ->
      when (result) {
        is ScanResult.Report -> {
          TriageQueue.init(context.applicationContext)
          TriageQueue.enqueue(result.report)
          // Schedule the background WorkManager job so the report survives
          // a process kill, AND fire an immediate foreground sync so the
          // user sees the report land on the dashboard without waiting for
          // WorkManager's scheduling latency.
          TriageSyncManager.scheduleBackgroundSync(context.applicationContext)
          scanFeedback =
            "Imported report ${result.report.reportId.take(14)}…  · syncing now"
          coroutineScope.launch(Dispatchers.IO) {
            val syncResult = TriageSyncManager.syncOnce()
            scanFeedback =
              if (syncResult.uploaded > 0) {
                "Imported report ${result.report.reportId.take(14)}…  · uploaded to dashboard"
              } else if (syncResult.stillQueued > 0) {
                "Imported report ${result.report.reportId.take(14)}…  · queued (network unreachable)"
              } else {
                "Imported report ${result.report.reportId.take(14)}…  · processed"
              }
          }
        }
        is ScanResult.NotARport ->
          scanFeedback = "Scanned QR isn't a triage report (${result.reason})."
        is ScanResult.Cancelled -> { /* no toast */ }
      }
    }

  // Request location on screen entry so by the time a triage finishes the
  // GPS fix is likely ready. Camera/mic are still requested on first use
  // because they have a tighter UX coupling to their buttons.
  LaunchedEffect(Unit) {
    if (!hasLocationPermission) {
      locationPermLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
    }
  }

  if (!isModelReady) {
    LoadingState(message = "Loading Gemma 4 E2B onto the device…")
    return
  }

  Column(
    modifier =
      Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState()),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    HeaderBlock(pendingCount = pendingReports.size)

    PhotoBlock(
      uiState = uiState,
      onCapture = {
        if (hasCameraPermission) cameraLauncher.launch(null)
        else cameraPermLauncher.launch(Manifest.permission.CAMERA)
      },
      onClear = viewModel::clearPhoto,
    )

    AudioBlock(
      uiState = uiState,
      onStartRecording = {
        if (!hasMicPermission) {
          micPermLauncher.launch(Manifest.permission.RECORD_AUDIO)
          return@AudioBlock
        }
        viewModel.setRecording(recording = true, elapsedMs = 0)
        recordingJobRef.value =
          coroutineScope.launch {
            startRecording(
              audioRecordRef = audioRecordRef,
              audioStream = audioStreamRef,
              onElapsedMs = { ms -> viewModel.setRecording(recording = true, elapsedMs = ms) },
              onMaxDurationReached = {
                val bytes = stopRecording(audioRecordRef, audioStreamRef, recordingJobRef)
                viewModel.onAudioCaptured(bytes, MAX_RECORDING_SEC * 1000L)
              },
            )
          }
      },
      onStopRecording = {
        val bytes = stopRecording(audioRecordRef, audioStreamRef, recordingJobRef)
        viewModel.onAudioCaptured(bytes, uiState.recordingElapsedMs)
      },
      onClear = viewModel::clearAudio,
    )

    when (uiState.phase) {
      TriagePhase.IDLE -> {
        InstructionsBlock()
        ScanRow(
          onScan = { scanLauncher.launch(QrCodeScanContract.defaultOptions()) },
          feedback = scanFeedback,
          onDismissFeedback = { scanFeedback = null },
        )
      }
      TriagePhase.CAPTURED ->
        ActionRow(
          primaryLabel = triageButtonLabel(uiState),
          primaryIcon = Icons.Outlined.PlayArrow,
          onPrimary = { viewModel.runTriage(model) },
          onReset = viewModel::reset,
          enabled = uiState.canTriage && !uiState.isRecording,
        )
      TriagePhase.INFERRING -> InferringBlock(uiState)
      TriagePhase.RESULT ->
        uiState.report?.let { report ->
          ResultCard(report = report, routing = uiState.routing, elapsedMs = uiState.inferenceMs)
          SyncStatusRow(sync = uiState.sync, onRetry = viewModel::retrySync)
          QrShareBlock(report = report)
          ActionRow(
            primaryLabel = "New triage",
            primaryIcon = Icons.Outlined.Refresh,
            onPrimary = viewModel::reset,
            onReset = null,
            enabled = true,
          )
          RawOutputBlock(uiState.rawOutput)
        }
      TriagePhase.ERROR -> ErrorBlock(uiState, onReset = viewModel::reset)
    }
  }
}

@Composable
private fun ScanRow(
  onScan: () -> Unit,
  feedback: String?,
  onDismissFeedback: () -> Unit,
) {
  Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
    OutlinedButton(
      onClick = onScan,
      modifier = Modifier.fillMaxWidth(),
    ) {
      Icon(Icons.Outlined.QrCodeScanner, contentDescription = null)
      Text(
        "Scan a report from another responder",
        modifier = Modifier.padding(start = 8.dp),
      )
    }
    if (feedback != null) {
      Row(
        modifier =
          Modifier.fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.secondaryContainer)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
      ) {
        Text(
          feedback,
          modifier = Modifier.weight(1f),
          style = MaterialTheme.typography.bodySmall,
          color = MaterialTheme.colorScheme.onSecondaryContainer,
        )
        IconButton(onClick = onDismissFeedback) {
          Icon(Icons.Outlined.Close, contentDescription = "Dismiss")
        }
      }
    }
  }
}

@Composable
private fun QrShareBlock(report: EdgeTriageReport) {
  // ZXing encoding is pure CPU; memoise so we only render the QR once
  // per report, not on every recomposition.
  val bitmap =
    remember(report.reportId) {
      try {
        QrCodeRenderer.encodeReport(report = report, sizePx = 640)
      } catch (e: Exception) {
        Log.w(TAG, "QR encode failed", e)
        null
      }
    }

  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(12.dp),
    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
  ) {
    Column(
      modifier = Modifier.padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
      Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
      ) {
        Icon(
          Icons.Outlined.QrCode,
          contentDescription = null,
          tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
          "Hand off to another responder",
          style = MaterialTheme.typography.titleSmall,
          fontWeight = FontWeight.SemiBold,
        )
      }
      Text(
        "Have them open this app, tap \"Scan a report\", and point at this screen. The full triage transfers without any network — they can sync it to the dashboard from their phone when they get connectivity.",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
      )
      if (bitmap != null) {
        Box(
          modifier =
            Modifier.fillMaxWidth()
              .padding(top = 4.dp),
          contentAlignment = Alignment.Center,
        ) {
          Image(
            bitmap = bitmap.asImageBitmap(),
            contentDescription = "QR code for this triage report",
            modifier = Modifier.size(280.dp).background(Color.White).padding(8.dp),
          )
        }
      } else {
        Text(
          "QR encoding failed.",
          style = MaterialTheme.typography.bodySmall,
          color = MaterialTheme.colorScheme.error,
        )
      }
    }
  }
}

private fun triageButtonLabel(state: TriageUiState): String =
  when {
    state.capturedBitmap != null && state.capturedAudio != null -> "Run triage (photo + voice)"
    state.capturedBitmap != null -> "Run triage (photo)"
    state.capturedAudio != null -> "Run triage (voice)"
    else -> "Run triage on device"
  }

@Composable
private fun HeaderBlock(pendingCount: Int) {
  Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp), modifier = Modifier.weight(1f)) {
      Text(
        "Gemma Rescue Grid · Edge Triage",
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold,
      )
      Text(
        "Offline · powered by Gemma 4 E2B · photo, voice, or both",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
      )
    }
    if (pendingCount > 0) {
      Row(
        modifier =
          Modifier.clip(RoundedCornerShape(20.dp))
            .background(Color(0xFFEF6C00).copy(alpha = 0.18f))
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
      ) {
        Icon(
          Icons.Outlined.CloudQueue,
          contentDescription = null,
          tint = Color(0xFFEF6C00),
          modifier = Modifier.size(14.dp),
        )
        Text(
          "$pendingCount queued",
          style = MaterialTheme.typography.labelSmall,
          fontWeight = FontWeight.Medium,
          color = Color(0xFFEF6C00),
        )
      }
    }
  }
}

@Composable
private fun InstructionsBlock() {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(12.dp),
    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
  ) {
    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
      Text(
        "Provide at least one input.",
        style = MaterialTheme.typography.labelMedium,
        fontWeight = FontWeight.Medium,
      )
      Text(
        "Snap a photo, record a voice note, or both. Gemma 4 E2B will produce the triage report.",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
      )
    }
  }
}

@Composable
private fun PhotoBlock(uiState: TriageUiState, onCapture: () -> Unit, onClear: () -> Unit) {
  val bitmap = uiState.capturedBitmap
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(12.dp),
    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
  ) {
    Box(
      modifier = Modifier.fillMaxWidth().height(180.dp),
      contentAlignment = Alignment.Center,
    ) {
      if (bitmap != null) {
        Image(
          bitmap = bitmap.asImageBitmap(),
          contentDescription = "Captured scene",
          modifier = Modifier.fillMaxSize(),
          contentScale = ContentScale.Crop,
        )
        IconButton(
          onClick = onClear,
          modifier = Modifier.align(Alignment.TopEnd).padding(6.dp),
        ) {
          Box(
            modifier =
              Modifier.size(28.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.6f)),
            contentAlignment = Alignment.Center,
          ) {
            Icon(
              Icons.Outlined.Close,
              contentDescription = "Discard photo",
              tint = Color.White,
              modifier = Modifier.size(18.dp),
            )
          }
        }
      } else {
        Column(
          horizontalAlignment = Alignment.CenterHorizontally,
          verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
          Icon(Icons.Outlined.Camera, contentDescription = null, modifier = Modifier.size(36.dp))
          Text("Photo of the scene (optional)", style = MaterialTheme.typography.bodyMedium)
        }
      }
    }
  }
  Button(
    onClick = onCapture,
    modifier = Modifier.fillMaxWidth(),
  ) {
    Icon(Icons.Outlined.Camera, contentDescription = null)
    Text(
      if (bitmap == null) "Snap photo" else "Retake photo",
      modifier = Modifier.padding(start = 8.dp),
    )
  }
}

@Composable
private fun AudioBlock(
  uiState: TriageUiState,
  onStartRecording: () -> Unit,
  onStopRecording: () -> Unit,
  onClear: () -> Unit,
) {
  val audio = uiState.capturedAudio
  val isRecording = uiState.isRecording

  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(12.dp),
    colors =
      CardDefaults.cardColors(
        containerColor =
          if (isRecording) MaterialTheme.colorScheme.errorContainer
          else MaterialTheme.colorScheme.surfaceVariant
      ),
  ) {
    Box(
      modifier = Modifier.fillMaxWidth().padding(16.dp),
      contentAlignment = Alignment.Center,
    ) {
      when {
        isRecording ->
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
          ) {
            Box(
              modifier =
                Modifier.size(12.dp).clip(CircleShape).background(Color(0xFFD32F2F)),
            )
            Text(
              "Recording…  ${formatMs(uiState.recordingElapsedMs)} / ${MAX_RECORDING_SEC}s",
              style = MaterialTheme.typography.bodyMedium,
              fontWeight = FontWeight.Medium,
              color = MaterialTheme.colorScheme.onErrorContainer,
            )
          }
        audio != null ->
          Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
          ) {
            Row(
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
              Icon(Icons.Outlined.Mic, contentDescription = null)
              Text(
                "Voice note · ${formatMs(uiState.audioDurationMs)}",
                style = MaterialTheme.typography.bodyMedium,
              )
            }
            IconButton(onClick = onClear) {
              Icon(Icons.Outlined.Close, contentDescription = "Discard voice note")
            }
          }
        else ->
          Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
          ) {
            Icon(Icons.Outlined.Mic, contentDescription = null, modifier = Modifier.size(36.dp))
            Text("Voice note of the scene (optional)", style = MaterialTheme.typography.bodyMedium)
          }
      }
    }
  }
  Button(
    onClick = if (isRecording) onStopRecording else onStartRecording,
    modifier = Modifier.fillMaxWidth(),
    colors =
      if (isRecording)
        ButtonDefaults.buttonColors(
          containerColor = MaterialTheme.colorScheme.error,
          contentColor = MaterialTheme.colorScheme.onError,
        )
      else ButtonDefaults.buttonColors(),
  ) {
    Icon(
      if (isRecording) Icons.Outlined.Stop else Icons.Outlined.Mic,
      contentDescription = null,
    )
    Text(
      when {
        isRecording -> "Stop recording"
        audio != null -> "Re-record voice note"
        else -> "Record voice note"
      },
      modifier = Modifier.padding(start = 8.dp),
    )
  }
}

@Composable
private fun SyncStatusRow(sync: SyncState, onRetry: () -> Unit) {
  // Resolve color & label from the sealed state.
  val (bgColor, fgColor, label, showRetry) =
    when (sync) {
      is SyncState.Idle ->
        Quad(
          MaterialTheme.colorScheme.surfaceVariant,
          MaterialTheme.colorScheme.onSurfaceVariant,
          "Not synced",
          false,
        )
      is SyncState.Syncing ->
        Quad(
          MaterialTheme.colorScheme.primaryContainer,
          MaterialTheme.colorScheme.onPrimaryContainer,
          "Syncing to dashboard…",
          false,
        )
      is SyncState.Synced ->
        Quad(
          Color(0xFF2E7D32).copy(alpha = 0.20f),
          Color(0xFF2E7D32),
          "Synced to dashboard",
          false,
        )
      is SyncState.Queued ->
        Quad(
          Color(0xFFEF6C00).copy(alpha = 0.20f),
          Color(0xFFEF6C00),
          "Queued for retry",
          true,
        )
      is SyncState.Failed ->
        Quad(
          MaterialTheme.colorScheme.errorContainer,
          MaterialTheme.colorScheme.onErrorContainer,
          "Sync failed",
          true,
        )
    }

  Row(
    modifier =
      Modifier.fillMaxWidth()
        .clip(RoundedCornerShape(10.dp))
        .background(bgColor)
        .padding(horizontal = 12.dp, vertical = 8.dp),
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(8.dp),
  ) {
    when (sync) {
      is SyncState.Syncing ->
        CircularProgressIndicator(
          modifier = Modifier.size(14.dp),
          strokeWidth = 2.dp,
          color = fgColor,
        )
      is SyncState.Synced ->
        Icon(Icons.Outlined.CloudDone, contentDescription = null, tint = fgColor, modifier = Modifier.size(16.dp))
      is SyncState.Queued ->
        Icon(Icons.Outlined.CloudQueue, contentDescription = null, tint = fgColor, modifier = Modifier.size(16.dp))
      is SyncState.Failed ->
        Icon(Icons.Outlined.CloudOff, contentDescription = null, tint = fgColor, modifier = Modifier.size(16.dp))
      is SyncState.Idle ->
        Icon(Icons.Outlined.CloudOff, contentDescription = null, tint = fgColor, modifier = Modifier.size(16.dp))
    }
    Column(modifier = Modifier.weight(1f)) {
      Text(label, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium, color = fgColor)
      if (sync is SyncState.Failed) {
        Text(
          sync.message,
          style = MaterialTheme.typography.labelSmall,
          color = fgColor.copy(alpha = 0.85f),
        )
      } else if (sync is SyncState.Queued) {
        Text(
          sync.reason,
          style = MaterialTheme.typography.labelSmall,
          color = fgColor.copy(alpha = 0.85f),
        )
      } else if (sync is SyncState.Synced && sync.receivedAt.isNotEmpty()) {
        Text(
          "Server confirmed at ${sync.receivedAt}",
          style = MaterialTheme.typography.labelSmall,
          color = fgColor.copy(alpha = 0.75f),
        )
      }
    }
    if (showRetry) {
      OutlinedButton(onClick = onRetry, contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 4.dp)) {
        Text("Retry", style = MaterialTheme.typography.labelMedium)
      }
    }
  }
}

/** Tiny 4-tuple helper for the row above. */
private data class Quad<A, B, C, D>(val a: A, val b: B, val c: C, val d: D)

@Composable
private fun ActionRow(
  primaryLabel: String,
  primaryIcon: androidx.compose.ui.graphics.vector.ImageVector,
  onPrimary: () -> Unit,
  onReset: (() -> Unit)?,
  enabled: Boolean,
) {
  Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.spacedBy(8.dp),
  ) {
    Button(onClick = onPrimary, modifier = Modifier.weight(1f), enabled = enabled) {
      Icon(primaryIcon, contentDescription = null)
      Text(primaryLabel, modifier = Modifier.padding(start = 8.dp))
    }
    if (onReset != null) {
      OutlinedButton(onClick = onReset) { Text("Reset") }
    }
  }
}

@Composable
private fun InferringBlock(uiState: TriageUiState) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(12.dp),
  ) {
    Column(
      modifier = Modifier.padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
      Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
      ) {
        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
        Text(
          "Triaging on device — fully offline…",
          style = MaterialTheme.typography.bodyMedium,
          fontWeight = FontWeight.Medium,
        )
      }
      if (uiState.rawOutput.isNotEmpty()) {
        Text(
          uiState.rawOutput,
          style = MaterialTheme.typography.bodySmall,
          fontFamily = FontFamily.Monospace,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
      }
    }
  }
}

@Composable
private fun ResultCard(
  report: EdgeTriageReport,
  routing: RoutingDecision?,
  elapsedMs: Long,
) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(12.dp),
    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
  ) {
    Column(
      modifier = Modifier.padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Column {
          Text(
            disasterLabel(report.disasterType),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
          )
          Text(
            "confidence ${"%.0f".format(report.disasterTypeConfidence * 100)}% · " +
              "${elapsedMs / 1000}s on device",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
          )
        }
        SeverityBadge(severity = report.severity)
      }

      HorizontalDivider()

      Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
          "Severity rationale",
          style = MaterialTheme.typography.labelMedium,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(report.severityRationale, style = MaterialTheme.typography.bodyMedium)
      }

      if (report.hazardsVisible.isNotEmpty()) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
          Text(
            "Hazards visible",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
          )
          FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            report.hazardsVisible.forEach { hazard ->
              AssistChip(
                onClick = {},
                label = { Text(hazard, fontSize = 12.sp) },
                leadingIcon = {
                  Icon(
                    Icons.Outlined.LocalFireDepartment,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                  )
                },
                colors =
                  AssistChipDefaults.assistChipColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.4f),
                  ),
              )
            }
          }
        }
      }

      val p = report.peopleVisible
      if (p.total > 0) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
          Text(
            "People visible",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
          )
          val parts = buildList {
            if (p.adults > 0) add("${p.adults} adult${if (p.adults == 1) "" else "s"}")
            if (p.children > 0) add("${p.children} child${if (p.children == 1) "" else "ren"}")
            if (p.elderlyApparent > 0) add("${p.elderlyApparent} elderly")
            if (p.injuredApparent > 0) add("${p.injuredApparent} injured")
            if (p.trappedApparent > 0) add("${p.trappedApparent} trapped")
          }
          Text(parts.joinToString(" · "), style = MaterialTheme.typography.bodyMedium)
        }
      }

      Box(
        modifier =
          Modifier.fillMaxWidth()
            .background(
              MaterialTheme.colorScheme.primaryContainer,
              RoundedCornerShape(8.dp),
            )
            .padding(12.dp),
      ) {
        Column {
          Text(
            "Immediate action",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onPrimaryContainer,
          )
          Text(
            report.immediateAction,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onPrimaryContainer,
          )
          Text(
            "Evacuation: ${evacuationLabel(report.evacuationPriority)}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onPrimaryContainer,
          )
        }
      }

      if (routing != null) {
        Box(
          modifier =
            Modifier.fillMaxWidth()
              .background(
                routingColor(routing.decision).copy(alpha = 0.18f),
                RoundedCornerShape(8.dp),
              )
              .padding(12.dp),
        ) {
          Column {
            Row(
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
              Text(
                routingLabel(routing.decision),
                fontWeight = FontWeight.Bold,
                color = routingColor(routing.decision),
              )
              if (routing.overridden) {
                Text(
                  "(escalated by app)",
                  style = MaterialTheme.typography.labelSmall,
                  color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
              }
            }
            Text(routing.rationale, style = MaterialTheme.typography.bodySmall)
          }
        }
      }
    }
  }
}

@Composable
private fun SeverityBadge(severity: Int) {
  val color =
    when (severity) {
      1 -> Color(0xFF2E7D32)
      2 -> Color(0xFF9E9D24)
      3 -> Color(0xFFEF6C00)
      4 -> Color(0xFFD84315)
      5 -> Color(0xFFB71C1C)
      else -> MaterialTheme.colorScheme.outline
    }
  Box(
    modifier =
      Modifier.size(56.dp).clip(RoundedCornerShape(12.dp)).background(color),
    contentAlignment = Alignment.Center,
  ) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
      Text(
        "$severity",
        color = Color.White,
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
      )
      Text("/ 5", color = Color.White, fontSize = 10.sp)
    }
  }
}

@Composable
private fun RawOutputBlock(raw: String) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(12.dp),
    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
  ) {
    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
      Text(
        "Raw model output",
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
      )
      Text(
        raw,
        style = MaterialTheme.typography.bodySmall,
        fontFamily = FontFamily.Monospace,
      )
    }
  }
}

@Composable
private fun ErrorBlock(uiState: TriageUiState, onReset: () -> Unit) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
  ) {
    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Text(
        "Triage failed",
        style = MaterialTheme.typography.titleMedium,
        color = MaterialTheme.colorScheme.onErrorContainer,
        fontWeight = FontWeight.Bold,
      )
      Text(
        uiState.errorMessage ?: "Unknown error",
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onErrorContainer,
      )
      if (uiState.rawOutput.isNotEmpty()) {
        Text(
          "Raw output (for debugging):",
          style = MaterialTheme.typography.labelSmall,
          color = MaterialTheme.colorScheme.onErrorContainer,
        )
        Text(
          uiState.rawOutput,
          style = MaterialTheme.typography.bodySmall,
          fontFamily = FontFamily.Monospace,
          color = MaterialTheme.colorScheme.onErrorContainer,
        )
      }
      Button(
        onClick = onReset,
        colors =
          ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.error,
            contentColor = MaterialTheme.colorScheme.onError,
          ),
      ) {
        Text("Try again")
      }
    }
  }
}

@Composable
private fun LoadingState(message: String) {
  Box(
    modifier = Modifier.fillMaxSize().padding(24.dp),
    contentAlignment = Alignment.Center,
  ) {
    Column(
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
      CircularProgressIndicator()
      Text(message, style = MaterialTheme.typography.bodyMedium)
    }
  }
}

// ───────────────────────────── Audio capture ─────────────────────────────

@SuppressLint("MissingPermission")
private suspend fun startRecording(
  audioRecordRef: androidx.compose.runtime.MutableState<AudioRecord?>,
  audioStream: ByteArrayOutputStream,
  onElapsedMs: (Long) -> Unit,
  onMaxDurationReached: () -> Unit,
) {
  val minBuf = AudioRecord.getMinBufferSize(AUDIO_SAMPLE_RATE, AUDIO_CHANNEL, AUDIO_FORMAT)
  audioRecordRef.value?.release()
  audioStream.reset()

  val recorder =
    AudioRecord(
      MediaRecorder.AudioSource.MIC,
      AUDIO_SAMPLE_RATE,
      AUDIO_CHANNEL,
      AUDIO_FORMAT,
      minBuf,
    )
  audioRecordRef.value = recorder

  val buf = ByteArray(minBuf)
  kotlinx.coroutines.coroutineScope {
    launch(Dispatchers.IO) {
      try {
        recorder.startRecording()
        val startMs = System.currentTimeMillis()
        while (audioRecordRef.value?.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
          val n = recorder.read(buf, 0, buf.size)
          if (n > 0) audioStream.write(buf, 0, n)
          val elapsed = System.currentTimeMillis() - startMs
          onElapsedMs(elapsed)
          if (elapsed >= MAX_RECORDING_SEC * 1000L) {
            onMaxDurationReached()
            break
          }
          delay(50)
        }
      } catch (e: Exception) {
        Log.e(TAG, "Recording loop crashed", e)
      }
    }
  }
}

private fun stopRecording(
  audioRecordRef: androidx.compose.runtime.MutableState<AudioRecord?>,
  audioStream: ByteArrayOutputStream,
  jobRef: androidx.compose.runtime.MutableState<Job?>,
): ByteArray {
  val recorder = audioRecordRef.value
  try {
    if (recorder?.recordingState == AudioRecord.RECORDSTATE_RECORDING) recorder.stop()
  } catch (e: Exception) {
    Log.w(TAG, "stopRecording: recorder already stopped", e)
  }
  recorder?.release()
  audioRecordRef.value = null
  jobRef.value?.cancel()
  jobRef.value = null

  val pcmBytes = audioStream.toByteArray()
  audioStream.reset()
  val wav = pcmToWav(pcm = pcmBytes, sampleRate = AUDIO_SAMPLE_RATE)
  Log.d(TAG, "Captured ${pcmBytes.size} PCM bytes -> ${wav.size} WAV bytes")
  return wav
}

/**
 * Prepend a 44-byte RIFF/WAVE header to raw PCM so LiteRT-LM's miniaudio
 * decoder can read it. Raw PCM yields "Failed to initialize miniaudio
 * decoder, error code: -10". Mono, 16-bit, sample rate as recorded.
 *
 * Header layout mirrors the gallery's ChatMessageAudioClip.genByteArrayForWav().
 */
private fun pcmToWav(pcm: ByteArray, sampleRate: Int): ByteArray {
  val channels = 1
  val bitsPerSample = 16
  val byteRate = sampleRate * channels * bitsPerSample / 8
  val pcmSize = pcm.size
  val totalSize = pcmSize + 44

  val header = ByteArray(44)
  // "RIFF"
  header[0] = 'R'.code.toByte(); header[1] = 'I'.code.toByte()
  header[2] = 'F'.code.toByte(); header[3] = 'F'.code.toByte()
  // total size - 8
  header[4] = (totalSize and 0xff).toByte()
  header[5] = (totalSize shr 8 and 0xff).toByte()
  header[6] = (totalSize shr 16 and 0xff).toByte()
  header[7] = (totalSize shr 24 and 0xff).toByte()
  // "WAVE"
  header[8] = 'W'.code.toByte(); header[9] = 'A'.code.toByte()
  header[10] = 'V'.code.toByte(); header[11] = 'E'.code.toByte()
  // "fmt "
  header[12] = 'f'.code.toByte(); header[13] = 'm'.code.toByte()
  header[14] = 't'.code.toByte(); header[15] = ' '.code.toByte()
  // subchunk1 size = 16 (PCM)
  header[16] = 16; header[17] = 0; header[18] = 0; header[19] = 0
  // audio format = 1 (PCM)
  header[20] = 1; header[21] = 0
  // num channels
  header[22] = channels.toByte(); header[23] = 0
  // sample rate
  header[24] = (sampleRate and 0xff).toByte()
  header[25] = (sampleRate shr 8 and 0xff).toByte()
  header[26] = (sampleRate shr 16 and 0xff).toByte()
  header[27] = (sampleRate shr 24 and 0xff).toByte()
  // byte rate
  header[28] = (byteRate and 0xff).toByte()
  header[29] = (byteRate shr 8 and 0xff).toByte()
  header[30] = (byteRate shr 16 and 0xff).toByte()
  header[31] = (byteRate shr 24 and 0xff).toByte()
  // block align
  header[32] = (channels * bitsPerSample / 8).toByte(); header[33] = 0
  // bits per sample
  header[34] = bitsPerSample.toByte(); header[35] = 0
  // "data"
  header[36] = 'd'.code.toByte(); header[37] = 'a'.code.toByte()
  header[38] = 't'.code.toByte(); header[39] = 'a'.code.toByte()
  // data size
  header[40] = (pcmSize and 0xff).toByte()
  header[41] = (pcmSize shr 8 and 0xff).toByte()
  header[42] = (pcmSize shr 16 and 0xff).toByte()
  header[43] = (pcmSize shr 24 and 0xff).toByte()

  return header + pcm
}

private fun formatMs(ms: Long): String {
  val totalSec = ms / 1000
  val mm = totalSec / 60
  val ss = totalSec % 60
  return "%d:%02d".format(mm, ss)
}

private fun disasterLabel(type: DisasterType): String =
  when (type) {
    DisasterType.FLOOD -> "Flood"
    DisasterType.EARTHQUAKE -> "Earthquake"
    DisasterType.LANDSLIDE -> "Landslide"
    DisasterType.FIRE -> "Fire"
    DisasterType.STORM -> "Storm"
    DisasterType.BUILDING_COLLAPSE -> "Building collapse"
    DisasterType.VOLCANIC -> "Volcanic"
    DisasterType.TSUNAMI -> "Tsunami"
    DisasterType.OTHER -> "Unidentified"
  }

private fun evacuationLabel(priority: EvacuationPriority): String =
  when (priority) {
    EvacuationPriority.IMMEDIATE -> "Immediate (minutes)"
    EvacuationPriority.URGENT -> "Urgent (within the hour)"
    EvacuationPriority.STANDBY -> "Standby"
    EvacuationPriority.NONE -> "Not required"
  }

private fun routingLabel(rec: RoutingRecommendation): String =
  when (rec) {
    RoutingRecommendation.FAST_LANE -> "FAST LANE — handle locally"
    RoutingRecommendation.DEEP_LANE -> "DEEP LANE — queue for 31B synthesis"
  }

private fun routingColor(rec: RoutingRecommendation): Color =
  when (rec) {
    RoutingRecommendation.FAST_LANE -> Color(0xFF2E7D32)
    RoutingRecommendation.DEEP_LANE -> Color(0xFFEF6C00)
  }
