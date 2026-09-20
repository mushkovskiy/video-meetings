import { Expose } from 'class-transformer';

export class UserRdo {
  @Expose()
  public id!: string;

  @Expose()
  public email!: string;

  @Expose()
  public firstName!: string;

  @Expose()
  public lastName!: string;
}
