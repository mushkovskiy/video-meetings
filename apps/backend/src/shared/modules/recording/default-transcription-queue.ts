import path from 'node:path';

import { inject, injectable } from 'inversify';

import type { AudioDecoder } from '../../libs/audio/audio-decoder.interface.js';
import type { Config } from '../../libs/config/config.interface.js';
import type { RestSchema } from '../../libs/config/rest.schema.js';
import type { Logger } from '../../libs/logger/logger.interface.js';
import type { TranscriptionService } from '../../libs/transcription/transcription-service.interface.js';
import { Component } from '../../types/component.type.js';
import type { RecordingService } from './recording-service.interface.js';
import { RecordingStatus } from './recording.entity.js';
import type { TranscriptionQueue } from './transcription-queue.interface.js';

const FAILURE_REASON = 'Не удалось распознать запись.';

// In-process queue with concurrency 1: Whisper is CPU/RAM hungry, and MongoDB is the
// source of truth, so `processing` recordings are simply re-enqueued on start-up.
@injectable()
export class DefaultTranscriptionQueue implements TranscriptionQueue {
  private readonly pending: string[] = [];
  private isRunning = false;
  private readonly uploadDirectory: string;

  constructor(
    @inject(Component.Logger) private readonly logger: Logger,
    @inject(Component.Config) config: Config<RestSchema>,
    @inject(Component.RecordingService) private readonly recordingService: RecordingService,
    @inject(Component.AudioDecoder) private readonly audioDecoder: AudioDecoder,
    @inject(Component.TranscriptionService)
    private readonly transcriptionService: TranscriptionService,
  ) {
    this.uploadDirectory = path.resolve(config.get('UPLOAD_DIRECTORY'));
  }

  public enqueue(recordingId: string): void {
    if (!this.pending.includes(recordingId)) {
      this.pending.push(recordingId);
    }

    void this.drain();
  }

  public async start(): Promise<void> {
    const recordings = await this.recordingService.findProcessing();

    for (const recording of recordings) {
      this.enqueue(recording.id as string);
    }

    this.logger.info(`Transcription queue started, ${recordings.length} recording(s) resumed`);
  }

  private async drain(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      let id = this.pending.shift();

      while (id !== undefined) {
        await this.process(id);
        id = this.pending.shift();
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async process(recordingId: string): Promise<void> {
    try {
      const recording = await this.recordingService.findById(recordingId);

      if (!recording || recording.status !== RecordingStatus.Processing) {
        return;
      }

      const samples = await this.audioDecoder.decode(
        path.join(this.uploadDirectory, recording.storedName),
      );
      const transcript = await this.transcriptionService.transcribe(samples);

      // Conditional update: a result for a recording that is no longer `processing` is dropped.
      const applied = await this.recordingService.completeTranscription(recordingId, transcript);

      if (!applied) {
        this.logger.debug(`Transcript of recording ${recordingId} discarded: not processing`);
      }
    } catch (error) {
      this.logger.error(`Transcription of recording ${recordingId} failed`, error as Error);

      try {
        await this.recordingService.failTranscription(recordingId, FAILURE_REASON);
      } catch (updateError) {
        this.logger.error(
          `Failed to mark recording ${recordingId} as failed`,
          updateError as Error,
        );
      }
    }
  }
}
