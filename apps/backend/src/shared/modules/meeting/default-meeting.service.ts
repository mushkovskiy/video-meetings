import type { DocumentType, ReturnModelType } from '@typegoose/typegoose';
import { inject, injectable } from 'inversify';

import { Component } from '../../types/component.type.js';
import type { CreateMeetingDto } from './dto/create-meeting.dto.js';
import type { MeetingService } from './meeting-service.interface.js';
import { MeetingEntity } from './meeting.entity.js';

@injectable()
export class DefaultMeetingService implements MeetingService {
  constructor(
    @inject(Component.MeetingModel)
    private readonly meetingModel: ReturnModelType<typeof MeetingEntity>,
  ) {}

  public async create(
    dto: CreateMeetingDto,
    ownerId: string,
  ): Promise<DocumentType<MeetingEntity>> {
    const meeting = new MeetingEntity({
      title: dto.title,
      description: dto.description,
      scheduledAt: new Date(dto.scheduledAt),
      ownerId,
    });

    return this.meetingModel.create(meeting);
  }

  public async findAllByOwner(ownerId: string): Promise<DocumentType<MeetingEntity>[]> {
    return this.meetingModel.find({ ownerId }).exec();
  }

  public async findById(id: string): Promise<DocumentType<MeetingEntity> | null> {
    return this.meetingModel.findById(id).exec();
  }
}
