import { defaultClasses, getModelForClass, modelOptions, prop } from '@typegoose/typegoose';

export interface MeetingConstructorData {
  title: string;
  description?: string;
  scheduledAt: Date;
  ownerId: string;
}

@modelOptions({
  schemaOptions: {
    collection: 'meetings',
    timestamps: true,
  },
})
export class MeetingEntity extends defaultClasses.TimeStamps {
  @prop({ required: true })
  public title!: string;

  @prop()
  public description?: string;

  @prop({ required: true })
  public scheduledAt!: Date;

  @prop({ required: true })
  public ownerId!: string;

  constructor(data?: MeetingConstructorData) {
    super();

    if (data) {
      this.title = data.title;
      this.description = data.description;
      this.scheduledAt = data.scheduledAt;
      this.ownerId = data.ownerId;
    }
  }
}

export const MeetingModel = getModelForClass(MeetingEntity);
