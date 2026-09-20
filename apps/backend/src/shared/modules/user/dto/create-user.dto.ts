import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  public email!: string;

  @IsString({ message: 'firstName is required' })
  @MinLength(1, { message: 'firstName must not be empty' })
  public firstName!: string;

  @IsString({ message: 'lastName is required' })
  @MinLength(1, { message: 'lastName must not be empty' })
  public lastName!: string;

  @IsString({ message: 'password is required' })
  @MinLength(6, { message: 'password must be at least 6 characters long' })
  public password!: string;
}
