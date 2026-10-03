import { Container } from 'inversify';

import type { AudioDecoder } from '../shared/libs/audio/audio-decoder.interface.js';
import { FfmpegAudioDecoder } from '../shared/libs/audio/ffmpeg-audio-decoder.js';
import type { Config } from '../shared/libs/config/config.interface.js';
import { RestConfig } from '../shared/libs/config/rest.config.js';
import type { RestSchema } from '../shared/libs/config/rest.schema.js';
import type { DatabaseClient } from '../shared/libs/database/database-client.interface.js';
import { MongoDatabaseClient } from '../shared/libs/database/mongo-database-client.js';
import type { Logger } from '../shared/libs/logger/logger.interface.js';
import { PinoLogger } from '../shared/libs/logger/pino.logger.js';
import { AppExceptionFilter } from '../shared/libs/rest/app-exception-filter.js';
import type { ExceptionFilter } from '../shared/libs/rest/exception-filter.interface.js';
import type { TranscriptionService } from '../shared/libs/transcription/transcription-service.interface.js';
import { WhisperTranscriptionService } from '../shared/libs/transcription/whisper-transcription.service.js';
import { createMeetingContainer } from '../shared/modules/meeting/meeting.container.js';
import { createRecordingContainer } from '../shared/modules/recording/recording.container.js';
import { createUserContainer } from '../shared/modules/user/user.container.js';
import { Component } from '../shared/types/component.type.js';
import { RestApplication } from './rest.application.js';

const createBaseContainer = () => {
  const container = new Container();

  container.bind<RestApplication>(Component.RestApplication).to(RestApplication).inSingletonScope();
  container.bind<Logger>(Component.Logger).to(PinoLogger).inSingletonScope();
  container.bind<Config<RestSchema>>(Component.Config).to(RestConfig).inSingletonScope();
  container
    .bind<DatabaseClient>(Component.DatabaseClient)
    .to(MongoDatabaseClient)
    .inSingletonScope();
  container
    .bind<ExceptionFilter>(Component.AppExceptionFilter)
    .to(AppExceptionFilter)
    .inSingletonScope();

  container.bind<AudioDecoder>(Component.AudioDecoder).to(FfmpegAudioDecoder).inSingletonScope();
  container
    .bind<TranscriptionService>(Component.TranscriptionService)
    .to(WhisperTranscriptionService)
    .inSingletonScope();

  return container;
};

export const createRestApplicationContainer = (): Container =>
  Container.merge(
    createBaseContainer(),
    createUserContainer(),
    createMeetingContainer(),
    createRecordingContainer(),
  ) as Container;
