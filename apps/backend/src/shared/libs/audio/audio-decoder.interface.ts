export interface AudioDecoder {
  /** Decodes an audio/video file into 16 kHz mono PCM samples (video tracks are dropped). */
  decode(filePath: string, signal?: AbortSignal): Promise<Float32Array>;
}
