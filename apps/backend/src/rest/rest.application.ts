import express, { type Express } from 'express';
import { inject, injectable } from 'inversify';

import { Component } from '../shared/types/component.type.js';
import type { Config } from '../shared/libs/config/config.interface.js';
import type { RestSchema } from '../shared/libs/config/rest.schema.js';
import type { Logger } from '../shared/libs/logger/logger.interface.js';

@injectable()
export class RestApplication {
  private readonly server: Express;

  constructor(
    @inject(Component.Logger) private readonly logger: Logger,
    @inject(Component.Config) private readonly config: Config<RestSchema>,
  ) {
    this.server = express();
  }

  private registerMiddlewares(): void {
    this.server.use(express.json());
  }

  private registerRoutes(): void {
    this.server.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok' });
    });
  }

  public async init(): Promise<void> {
    this.logger.info('Initializing REST application...');

    this.registerMiddlewares();
    this.registerRoutes();

    const port = this.config.get('PORT');
    this.server.listen(port, () => {
      this.logger.info(`Server started on http://localhost:${port}`);
    });
  }
}
