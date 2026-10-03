export interface TranscriptionService {
  /** Transcribes 16 kHz mono PCM samples into text. */
  transcribe(samples: Float32Array): Promise<string>;
  /** Loads the model ahead of the first request so it does not delay the first job. */
  warmUp(): Promise<void>;
}
