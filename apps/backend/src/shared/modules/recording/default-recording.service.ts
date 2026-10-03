import type { DocumentType, ReturnModelType } from '@typegoose/typegoose';
import { inject, injectable } from 'inversify';

import { Component } from '../../types/component.type.js';
import type { RecordingService } from './recording-service.interface.js';
import type { RecordingConstructorData } from './recording.entity.js';
import { RecordingEntity } from './recording.entity.js';

@injectable()
export class DefaultRecordingService implements RecordingService {
  constructor(
    @inject(Component.RecordingModel)
    private readonly recordingModel: ReturnModelType<typeof RecordingEntity>,
  ) {}

  public async create(data: RecordingConstructorData): Promise<DocumentType<RecordingEntity>> {
    return this.recordingModel.create(new RecordingEntity(data));
  }

  public async findByMeetingId(meetingId: string): Promise<DocumentType<RecordingEntity> | null> {
    return this.recordingModel.findOne({ meetingId }).exec();
  }
}
