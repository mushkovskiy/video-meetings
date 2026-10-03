export interface TranscriptionQueue {
  /** Schedules a recording for transcription. Works without `start()`. */
  enqueue(recordingId: string): void;
  /** Re-enqueues recordings left in `processing` by a previous run of the server. */
  start(): Promise<void>;
}
