import type { DocumentType, ReturnModelType } from '@typegoose/typegoose';
import { inject, injectable } from 'inversify';

import { Component } from '../../types/component.type.js';
import type { RecordingService } from './recording-service.interface.js';
import type { RecordingConstructorData } from './recording.entity.js';
import { RecordingEntity, RecordingStatus } from './recording.entity.js';

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

  public async deleteById(id: string): Promise<void> {
    await this.recordingModel.deleteOne({ _id: id }).exec();
  }

  public async findById(id: string): Promise<DocumentType<RecordingEntity> | null> {
    return this.recordingModel.findById(id).exec();
  }

  public async findProcessing(): Promise<DocumentType<RecordingEntity>[]> {
    return this.recordingModel
      .find({ status: RecordingStatus.Processing })
      .sort({ createdAt: 1 })
      .exec();
  }

  public async completeTranscription(id: string, transcript: string): Promise<boolean> {
    const result = await this.recordingModel
      .updateOne(
        { _id: id, status: RecordingStatus.Processing },
        { $set: { status: RecordingStatus.Done, transcript } },
      )
      .exec();

    return result.matchedCount > 0;
  }

  public async failTranscription(id: string, failureReason: string): Promise<boolean> {
    const result = await this.recordingModel
      .updateOne(
        { _id: id, status: RecordingStatus.Processing },
        { $set: { status: RecordingStatus.Failed, failureReason } },
      )
      .exec();

    return result.matchedCount > 0;
  }
}
