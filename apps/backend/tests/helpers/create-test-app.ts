import 'reflect-metadata';

import type { Express } from 'express';

import { Component } from '../../src/shared/types/component.type.js';
import type { RestApplication } from '../../src/rest/rest.application.js';
import { createRestApplicationContainer } from '../../src/rest/rest.container.js';

export const createTestApp = (): Express => {
  const container = createRestApplicationContainer();
  const application = container.get<RestApplication>(Component.RestApplication);

  return application.getServer();
};
