import 'reflect-metadata';

import { Component } from './shared/types/component.type.js';
import type { RestApplication } from './rest/rest.application.js';
import { createRestApplicationContainer } from './rest/rest.container.js';

const bootstrap = async (): Promise<void> => {
  const container = createRestApplicationContainer();
  const application = container.get<RestApplication>(Component.RestApplication);

  await application.init();
};

bootstrap();
