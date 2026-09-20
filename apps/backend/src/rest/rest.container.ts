import { Container } from 'inversify';

import type { Config } from '../shared/libs/config/config.interface.js';
import { RestConfig } from '../shared/libs/config/rest.config.js';
import type { RestSchema } from '../shared/libs/config/rest.schema.js';
import type { DatabaseClient } from '../shared/libs/database/database-client.interface.js';
import { MongoDatabaseClient } from '../shared/libs/database/mongo-database-client.js';
import type { Logger } from '../shared/libs/logger/logger.interface.js';
import { PinoLogger } from '../shared/libs/logger/pino.logger.js';
import { AppExceptionFilter } from '../shared/libs/rest/app-exception-filter.js';
import type { ExceptionFilter } from '../shared/libs/rest/exception-filter.interface.js';
import { createUserContainer } from '../shared/modules/user/user.container.js';
import { Component } from '../shared/types/component.type.js';
import { RestApplication } from './rest.application.js';

const createBaseContainer = () => {
  const container = new Container();

  container.bind<RestApplication>(Component.RestApplication).to(RestApplication).inSingletonScope();
  container.bind<Logger>(Component.Logger).to(PinoLogger).inSingletonScope();
  container.bind<Config<RestSchema>>(Component.Config).to(RestConfig).inSingletonScope();
  container
    .bind<DatabaseClient>(Component.DatabaseClient)
    .to(MongoDatabaseClient)
    .inSingletonScope();
  container
    .bind<ExceptionFilter>(Component.AppExceptionFilter)
    .to(AppExceptionFilter)
    .inSingletonScope();

  return container;
};

export const createRestApplicationContainer = (): Container =>
  Container.merge(createBaseContainer(), createUserContainer()) as Container;
