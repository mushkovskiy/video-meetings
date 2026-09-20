import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMeetingDto {
  @IsString({ message: 'title is required' })
  @MinLength(1, { message: 'title must not be empty' })
  public title!: string;

  @IsOptional()
  @IsString({ message: 'description must be a string' })
  public description?: string;

  @IsDateString({}, { message: 'scheduledAt must be a valid ISO 8601 date string' })
  public scheduledAt!: string;
}
