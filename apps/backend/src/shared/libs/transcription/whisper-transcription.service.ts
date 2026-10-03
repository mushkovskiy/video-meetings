import { inject, injectable } from 'inversify';

import { Component } from '../../types/component.type.js';
import type { Config } from '../config/config.interface.js';
import type { RestSchema } from '../config/rest.schema.js';
import type { TranscriptionService } from './transcription-service.interface.js';

type Transcriber = (
  samples: Float32Array,
  options: Record<string, unknown>,
) => Promise<{ text: string } | Array<{ text: string }>>;

@injectable()
export class WhisperTranscriptionService implements TranscriptionService {
  private transcriberPromise: Promise<Transcriber> | null = null;

  constructor(@inject(Component.Config) private readonly config: Config<RestSchema>) {}

  // Created once: loading the model on every job is far too slow.
  private getTranscriber(): Promise<Transcriber> {
    if (!this.transcriberPromise) {
      this.transcriberPromise = this.createTranscriber().catch((error: unknown) => {
        this.transcriberPromise = null;
        throw error;
      });
    }

    return this.transcriberPromise;
  }

  private async createTranscriber(): Promise<Transcriber> {
    // Imported lazily so that building the DI container (e.g. in tests) does not load
    // the native onnxruntime binary.
    const { pipeline, env } = await import('@huggingface/transformers');

    env.cacheDir = this.config.get('TRANSCRIPTION_CACHE_DIR');

    const transcriber = await (pipeline as unknown as (...args: unknown[]) => Promise<unknown>)(
      'automatic-speech-recognition',
      this.config.get('TRANSCRIPTION_MODEL'),
      { dtype: 'q8', device: 'cpu' },
    );

    return transcriber as Transcriber;
  }

  public async warmUp(): Promise<void> {
    await this.getTranscriber();
  }

  public async transcribe(samples: Float32Array): Promise<string> {
    const transcriber = await this.getTranscriber();
    // chunk_length_s is required: without it Whisper only handles the first 30 seconds.
    const result = await transcriber(samples, {
      language: this.config.get('TRANSCRIPTION_LANGUAGE'),
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    return (Array.isArray(result) ? result.map((r) => r.text).join(' ') : result.text).trim();
  }
}
