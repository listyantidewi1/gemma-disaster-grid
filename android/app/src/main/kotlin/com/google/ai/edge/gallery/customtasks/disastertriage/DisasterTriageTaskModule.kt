/*
 * Copyright 2026 Gemma Rescue Grid contributors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 */

package com.google.ai.edge.gallery.customtasks.disastertriage

import com.google.ai.edge.gallery.customtasks.common.CustomTask
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

/**
 * Registers [DisasterTriageTask] with the gallery's plugin set so the home
 * screen discovers it automatically. Required for the custom task to show
 * up — the gallery iterates over the injected Set<CustomTask>.
 */
@Module
@InstallIn(SingletonComponent::class)
internal object DisasterTriageTaskModule {
  @Provides
  @IntoSet
  fun provideDisasterTriageTask(): CustomTask = DisasterTriageTask()
}
