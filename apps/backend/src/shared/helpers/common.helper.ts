import { plainToInstance, type ClassConstructor } from 'class-transformer';

export const fillDTO = <T, V>(SomeDto: ClassConstructor<T>, plainObject: V): T =>
  plainToInstance(SomeDto, plainObject, { excludeExtraneousValues: true });
