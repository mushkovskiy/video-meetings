import { defaultClasses, getModelForClass, index, modelOptions, prop } from '@typegoose/typegoose';

export enum RecordingStatus {
  Processing = 'processing',
  Done = 'done',
  Failed = 'failed',
}

export interface RecordingConstructorData {
  meetingId: string;
  ownerId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  status: RecordingStatus;
}

@modelOptions({
  schemaOptions: {
    collection: 'recordings',
    timestamps: true,
  },
})
@index({ meetingId: 1 }, { unique: true })
export class RecordingEntity extends defaultClasses.TimeStamps {
  // `type` is explicit on every prop — see the "Dev runner" note in apps/backend/CLAUDE.md.
  @prop({ required: true, type: () => String })
  public meetingId!: string;

  @prop({ required: true, type: () => String })
  public ownerId!: string;

  @prop({ required: true, type: () => String })
  public originalName!: string;

  // Path relative to UPLOAD_DIRECTORY (e.g. `recordings/<meetingId>/<id>.mp3`).
  @prop({ required: true, type: () => String })
  public storedName!: string;

  @prop({ required: true, type: () => String })
  public mimeType!: string;

  @prop({ required: true, type: () => Number })
  public size!: number;

  @prop({ required: true, enum: RecordingStatus, type: () => String })
  public status!: RecordingStatus;

  @prop({ type: () => String })
  public transcript?: string;

  @prop({ type: () => String })
  public failureReason?: string;

  constructor(data?: RecordingConstructorData) {
    super();

    if (data) {
      this.meetingId = data.meetingId;
      this.ownerId = data.ownerId;
      this.originalName = data.originalName;
      this.storedName = data.storedName;
      this.mimeType = data.mimeType;
      this.size = data.size;
      this.status = data.status;
    }
  }
}

export const RecordingModel = getModelForClass(RecordingEntity);
