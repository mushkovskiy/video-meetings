import { defaultClasses, getModelForClass, modelOptions, prop } from '@typegoose/typegoose';
import { createHmac } from 'node:crypto';

export interface UserConstructorData {
  email: string;
  firstName: string;
  lastName: string;
}

@modelOptions({
  schemaOptions: {
    collection: 'users',
    timestamps: true,
  },
})
export class UserEntity extends defaultClasses.TimeStamps {
  // `type` is explicit because esbuild (used by tsx's dev runner) doesn't
  // emit the `design:type` decorator metadata Typegoose would otherwise
  // infer this from — see the "Dev runner" note in apps/backend/CLAUDE.md.
  @prop({ required: true, unique: true, type: () => String })
  public email!: string;

  @prop({ required: true, type: () => String })
  public firstName!: string;

  @prop({ required: true, type: () => String })
  public lastName!: string;

  @prop({ required: true, type: () => String })
  public passwordHash!: string;

  constructor(data?: UserConstructorData) {
    super();

    if (data) {
      this.email = data.email;
      this.firstName = data.firstName;
      this.lastName = data.lastName;
    }
  }

  public setPassword(password: string, salt: string): void {
    this.passwordHash = createHmac('sha256', salt).update(password).digest('hex');
  }

  public verifyPassword(password: string, salt: string): boolean {
    const hash = createHmac('sha256', salt).update(password).digest('hex');

    return this.passwordHash === hash;
  }
}

export const UserModel = getModelForClass(UserEntity);
