import type { DocumentType } from '@typegoose/typegoose';

import type { RecordingConstructorData } from './recording.entity.js';
import type { RecordingEntity } from './recording.entity.js';

export interface RecordingService {
  create(data: RecordingConstructorData): Promise<DocumentType<RecordingEntity>>;
  findByMeetingId(meetingId: string): Promise<DocumentType<RecordingEntity> | null>;
  deleteById(id: string): Promise<void>;
  findById(id: string): Promise<DocumentType<RecordingEntity> | null>;
  findProcessing(): Promise<DocumentType<RecordingEntity>[]>;
  /** Saves the transcript only while the recording is still `processing`; returns whether it was applied. */
  completeTranscription(id: string, transcript: string): Promise<boolean>;
  /** Marks the recording as failed only while it is still `processing`; returns whether it was applied. */
  failTranscription(id: string, failureReason: string): Promise<boolean>;
}
