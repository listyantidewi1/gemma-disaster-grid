/*
 * Copyright 2026 Gemma Rescue Grid contributors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

package com.google.ai.edge.gallery.customtasks.disastertriage

import ai.grg.EDGE_SYSTEM_PROMPT
import android.content.Context
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.runtime.Composable
import com.google.ai.edge.gallery.customtasks.common.CustomTask
import com.google.ai.edge.gallery.customtasks.common.CustomTaskData
import com.google.ai.edge.gallery.data.Category
import com.google.ai.edge.gallery.data.Model
import com.google.ai.edge.gallery.data.Task
import com.google.ai.edge.gallery.ui.llmchat.LlmChatModelHelper
import com.google.ai.edge.litertlm.Contents
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope

/**
 * Gemma Rescue Grid — on-device disaster triage.
 *
 * A field responder snaps a photo of a disaster scene; Gemma 4 E2B running
 * fully offline on the phone produces a structured EdgeTriageReport JSON
 * object (severity, hazards, people visible, immediate action, routing
 * recommendation) which we parse and render as a card.
 *
 * The system prompt is locked to ai.grg.EDGE_SYSTEM_PROMPT — the user
 * cannot edit it from the UI. This guarantees every triage uses the same
 * contract the synthesis tier expects.
 */
class DisasterTriageTask @Inject constructor() : CustomTask {
  override val task: Task =
    Task(
      id = TASK_ID,
      label = "Disaster Triage",
      category = Category.LLM,
      icon = Icons.Outlined.Warning,
      description =
        "Snap a photo of a disaster scene; Gemma 4 E2B produces a structured triage report " +
          "(severity, hazards, immediate action, routing recommendation) fully offline on this phone.",
      shortDescription = "On-device disaster triage with Gemma 4 E2B",
      docUrl = "https://github.com/listyantidewi1/gemma-disaster-grid",
      sourceCodeUrl =
        "https://github.com/listyantidewi1/gemma-disaster-grid/tree/main/android",
      models = mutableListOf(),
    )

  override fun initializeModelFn(
    context: Context,
    coroutineScope: CoroutineScope,
    model: Model,
    systemInstruction: Contents?,
    onDone: (String) -> Unit,
  ) {
    LlmChatModelHelper.initialize(
      context = context,
      model = model,
      taskId = task.id,
      supportImage = true,
      supportAudio = true,
      onDone = onDone,
      systemInstruction = Contents.of(EDGE_SYSTEM_PROMPT),
    )
  }

  override fun cleanUpModelFn(
    context: Context,
    coroutineScope: CoroutineScope,
    model: Model,
    onDone: () -> Unit,
  ) {
    LlmChatModelHelper.cleanUp(model = model, onDone = onDone)
  }

  @Composable
  override fun MainScreen(data: Any) {
    val customTaskData = data as CustomTaskData
    DisasterTriageScreen(
      modelManagerViewModel = customTaskData.modelManagerViewModel,
    )
  }

  companion object {
    const val TASK_ID = "disaster_triage"
  }
}
