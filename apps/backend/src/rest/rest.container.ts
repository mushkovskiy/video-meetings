import { Container } from 'inversify';

import { Component } from '../shared/types/component.type.js';
import type { Config } from '../shared/libs/config/config.interface.js';
import { RestConfig } from '../shared/libs/config/rest.config.js';
import type { RestSchema } from '../shared/libs/config/rest.schema.js';
import type { Logger } from '../shared/libs/logger/logger.interface.js';
import { PinoLogger } from '../shared/libs/logger/pino.logger.js';
import { RestApplication } from './rest.application.js';

export const createRestApplicationContainer = () => {
  const container = new Container();

  container.bind<RestApplication>(Component.RestApplication).to(RestApplication).inSingletonScope();
  container.bind<Logger>(Component.Logger).to(PinoLogger).inSingletonScope();
  container.bind<Config<RestSchema>>(Component.Config).to(RestConfig).inSingletonScope();

  return container;
};
