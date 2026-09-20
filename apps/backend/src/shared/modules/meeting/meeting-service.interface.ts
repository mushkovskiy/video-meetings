import type { DocumentType } from '@typegoose/typegoose';

import type { CreateMeetingDto } from './dto/create-meeting.dto.js';
import type { MeetingEntity } from './meeting.entity.js';

export interface MeetingService {
  create(dto: CreateMeetingDto, ownerId: string): Promise<DocumentType<MeetingEntity>>;
  findAllByOwner(ownerId: string): Promise<DocumentType<MeetingEntity>[]>;
  findById(id: string): Promise<DocumentType<MeetingEntity> | null>;
}
