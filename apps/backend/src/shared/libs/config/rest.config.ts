import 'dotenv/config';
import { inject, injectable } from 'inversify';

import { Component } from '../../types/component.type.js';
import type { Logger } from '../logger/logger.interface.js';
import type { Config } from './config.interface.js';
import { restSchema, type RestSchema } from './rest.schema.js';

@injectable()
export class RestConfig implements Config<RestSchema> {
  private readonly config: typeof restSchema;

  constructor(@inject(Component.Logger) private readonly logger: Logger) {
    restSchema.validate({ allowed: 'strict' });
    this.config = restSchema;
    this.logger.info('Config loaded and validated successfully');
  }

  public get<K extends keyof RestSchema>(key: K): RestSchema[K] {
    return this.config.get(key) as RestSchema[K];
  }
}
