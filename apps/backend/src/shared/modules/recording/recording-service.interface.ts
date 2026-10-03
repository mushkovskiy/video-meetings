import type { DocumentType } from '@typegoose/typegoose';

import type { RecordingConstructorData } from './recording.entity.js';
import type { RecordingEntity } from './recording.entity.js';

export interface RecordingService {
  create(data: RecordingConstructorData): Promise<DocumentType<RecordingEntity>>;
  findByMeetingId(meetingId: string): Promise<DocumentType<RecordingEntity> | null>;
}
