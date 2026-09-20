import type { DocumentType } from '@typegoose/typegoose';

import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UserEntity } from './user.entity.js';

export interface UserService {
  findByEmail(email: string): Promise<DocumentType<UserEntity> | null>;
  create(dto: CreateUserDto, salt: string): Promise<DocumentType<UserEntity>>;
}
