/*
 * Copyright 2026 Gemma Rescue Grid contributors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 */

package com.google.ai.edge.gallery.customtasks.disastertriage

import ai.grg.DisasterType
import ai.grg.EdgeTriageReport
import ai.grg.EvacuationPriority
import ai.grg.RoutingDecision
import ai.grg.RoutingRecommendation
import android.Manifest
import android.content.pm.PackageManager
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Camera
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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

  var hasCameraPermission by remember {
    mutableStateOf(
      ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
        PackageManager.PERMISSION_GRANTED
    )
  }

  val permissionLauncher =
    rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
      hasCameraPermission = granted
    }

  val cameraLauncher =
    rememberLauncherForActivityResult(ActivityResultContracts.TakePicturePreview()) { bitmap ->
      if (bitmap != null) viewModel.onPhotoCaptured(bitmap)
    }

  LaunchedEffect(Unit) {
    if (!hasCameraPermission) permissionLauncher.launch(Manifest.permission.CAMERA)
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
    HeaderBlock()

    PhotoBlock(
      uiState = uiState,
      onCapture = {
        if (hasCameraPermission) cameraLauncher.launch(null)
        else permissionLauncher.launch(Manifest.permission.CAMERA)
      },
    )

    when (uiState.phase) {
      TriagePhase.IDLE -> Unit
      TriagePhase.CAPTURED ->
        ActionRow(
          primaryLabel = "Run triage on device",
          primaryIcon = Icons.Outlined.PlayArrow,
          onPrimary = { viewModel.runTriage(model) },
          onReset = viewModel::reset,
        )
      TriagePhase.INFERRING -> InferringBlock(uiState)
      TriagePhase.RESULT ->
        uiState.report?.let { report ->
          ResultCard(report = report, routing = uiState.routing, elapsedMs = uiState.inferenceMs)
          ActionRow(
            primaryLabel = "New triage",
            primaryIcon = Icons.Outlined.Refresh,
            onPrimary = viewModel::reset,
            onReset = null,
          )
          RawOutputBlock(uiState.rawOutput)
        }
      TriagePhase.ERROR -> ErrorBlock(uiState, onReset = viewModel::reset)
    }
  }
}

@Composable
private fun HeaderBlock() {
  Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
    Text(
      "Gemma Rescue Grid · Edge Triage",
      style = MaterialTheme.typography.titleMedium,
      fontWeight = FontWeight.SemiBold,
    )
    Text(
      "Offline · powered by Gemma 4 E2B",
      style = MaterialTheme.typography.bodySmall,
      color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
  }
}

@Composable
private fun PhotoBlock(uiState: TriageUiState, onCapture: () -> Unit) {
  val bitmap = uiState.capturedBitmap
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(12.dp),
    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
  ) {
    Box(
      modifier = Modifier.fillMaxWidth().height(220.dp),
      contentAlignment = Alignment.Center,
    ) {
      if (bitmap != null) {
        Image(
          bitmap = bitmap.asImageBitmap(),
          contentDescription = "Captured scene",
          modifier = Modifier.fillMaxSize(),
          contentScale = ContentScale.Crop,
        )
      } else {
        Column(
          horizontalAlignment = Alignment.CenterHorizontally,
          verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
          Icon(Icons.Outlined.Camera, contentDescription = null, modifier = Modifier.size(48.dp))
          Text(
            "Tap below to snap a scene",
            style = MaterialTheme.typography.bodyMedium,
          )
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
      if (bitmap == null) "Snap & triage" else "Retake photo",
      modifier = Modifier.padding(start = 8.dp),
    )
  }
}

@Composable
private fun ActionRow(
  primaryLabel: String,
  primaryIcon: androidx.compose.ui.graphics.vector.ImageVector,
  onPrimary: () -> Unit,
  onReset: (() -> Unit)?,
) {
  Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.spacedBy(8.dp),
  ) {
    Button(onClick = onPrimary, modifier = Modifier.weight(1f)) {
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
