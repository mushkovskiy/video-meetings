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
  // `type` is explicit because esbuild (used by tsx's dev runner) doesn't
  // emit the `design:type` decorator metadata Typegoose would otherwise
  // infer this from — see the "Dev runner" note in apps/backend/CLAUDE.md.
  @prop({ required: true, type: () => String })
  public title!: string;

  @prop({ type: () => String })
  public description?: string;

  @prop({ required: true, type: () => Date })
  public scheduledAt!: Date;

  @prop({ required: true, type: () => String })
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
