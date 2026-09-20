import type { DocumentType, ReturnModelType } from '@typegoose/typegoose';
import { inject, injectable } from 'inversify';

import { Component } from '../../types/component.type.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UserService } from './user-service.interface.js';
import { UserEntity } from './user.entity.js';

@injectable()
export class DefaultUserService implements UserService {
  constructor(
    @inject(Component.UserModel) private readonly userModel: ReturnModelType<typeof UserEntity>,
  ) {}

  public async findByEmail(email: string): Promise<DocumentType<UserEntity> | null> {
    return this.userModel.findOne({ email }).exec();
  }

  public async create(dto: CreateUserDto, salt: string): Promise<DocumentType<UserEntity>> {
    const user = new UserEntity({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
    user.setPassword(dto.password, salt);

    return this.userModel.create(user);
  }
}
