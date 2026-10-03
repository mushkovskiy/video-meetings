import 'reflect-metadata';

import type { Express } from 'express';

import type { RestApplication } from '../../src/rest/rest.application.js';
import { createRestApplicationContainer } from '../../src/rest/rest.container.js';
import type { AudioDecoder } from '../../src/shared/libs/audio/audio-decoder.interface.js';
import type { TranscriptionService } from '../../src/shared/libs/transcription/transcription-service.interface.js';
import { Component } from '../../src/shared/types/component.type.js';

export interface TestAppOptions {
  audioDecoder?: AudioDecoder;
  transcriptionService?: TranscriptionService;
}

// By default recordings stay in `processing` forever (the fakes never settle), so tests
// that don't care about transcription neither run ffmpeg/Whisper nor see a status change.
const pendingAudioDecoder: AudioDecoder = {
  decode: () => new Promise(() => undefined),
};
const pendingTranscriptionService: TranscriptionService = {
  transcribe: () => new Promise(() => undefined),
  warmUp: () => Promise.resolve(),
};

export const createTestApp = (options: TestAppOptions = {}): Express => {
  const container = createRestApplicationContainer();

  container
    .rebind<AudioDecoder>(Component.AudioDecoder)
    .toConstantValue(options.audioDecoder ?? pendingAudioDecoder);
  container
    .rebind<TranscriptionService>(Component.TranscriptionService)
    .toConstantValue(options.transcriptionService ?? pendingTranscriptionService);

  const application = container.get<RestApplication>(Component.RestApplication);

  return application.getServer();
};
