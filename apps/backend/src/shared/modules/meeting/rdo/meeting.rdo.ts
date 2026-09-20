import { Expose } from 'class-transformer';

export class MeetingRdo {
  @Expose()
  public id!: string;

  @Expose()
  public title!: string;

  @Expose()
  public description?: string;

  @Expose()
  public scheduledAt!: Date;
}
