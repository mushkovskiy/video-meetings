import type { ReturnModelType } from '@typegoose/typegoose';
import { Container } from 'inversify';

import { Component } from '../../types/component.type.js';
import { DefaultUserService } from './default-user.service.js';
import type { UserService } from './user-service.interface.js';
import { UserController } from './user.controller.js';
import type { UserEntity } from './user.entity.js';
import { UserModel } from './user.entity.js';

export const createUserContainer = (): Container => {
  const container = new Container();

  container.bind<UserService>(Component.UserService).to(DefaultUserService).inSingletonScope();
  container
    .bind<ReturnModelType<typeof UserEntity>>(Component.UserModel)
    .toConstantValue(UserModel);
  container.bind<UserController>(Component.UserController).to(UserController).inSingletonScope();

  return container;
};
