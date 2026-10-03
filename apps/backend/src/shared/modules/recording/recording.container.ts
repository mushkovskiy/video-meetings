import type { ReturnModelType } from '@typegoose/typegoose';
import { Container } from 'inversify';

import { Component } from '../../types/component.type.js';
import { DefaultTranscriptionQueue } from './default-transcription-queue.js';
import type { TranscriptionQueue } from './transcription-queue.interface.js';
import { DefaultRecordingService } from './default-recording.service.js';
import type { RecordingService } from './recording-service.interface.js';
import { RecordingController } from './recording.controller.js';
import type { RecordingEntity } from './recording.entity.js';
import { RecordingModel } from './recording.entity.js';

export const createRecordingContainer = (): Container => {
  const container = new Container();

  container
    .bind<RecordingService>(Component.RecordingService)
    .to(DefaultRecordingService)
    .inSingletonScope();
  container
    .bind<ReturnModelType<typeof RecordingEntity>>(Component.RecordingModel)
    .toConstantValue(RecordingModel);
  container
    .bind<RecordingController>(Component.RecordingController)
    .to(RecordingController)
    .inSingletonScope();

  container
    .bind<TranscriptionQueue>(Component.TranscriptionQueue)
    .to(DefaultTranscriptionQueue)
    .inSingletonScope();

  return container;
};
