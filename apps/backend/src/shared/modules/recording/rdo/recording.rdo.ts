import { Expose } from 'class-transformer';

import type { RecordingStatus } from '../recording.entity.js';

export class RecordingRdo {
  @Expose()
  public id!: string;

  @Expose()
  public originalName!: string;

  @Expose()
  public size!: number;

  @Expose()
  public mimeType!: string;

  @Expose()
  public status!: RecordingStatus;

  @Expose()
  public uploadedAt!: Date;

  @Expose()
  public transcript?: string;

  @Expose()
  public failureReason?: string;
}
