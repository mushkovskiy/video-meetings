import express, { type Express } from 'express';
import { inject, injectable } from 'inversify';

import { Component } from '../shared/types/component.type.js';
import type { Config } from '../shared/libs/config/config.interface.js';
import type { RestSchema } from '../shared/libs/config/rest.schema.js';
import type { Logger } from '../shared/libs/logger/logger.interface.js';

@injectable()
export class RestApplication {
  private readonly server: Express;
  private isBootstrapped = false;

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

  // Lets supertest exercise the app without binding a real port.
  public getServer(): Express {
    if (!this.isBootstrapped) {
      this.registerMiddlewares();
      this.registerRoutes();
      this.isBootstrapped = true;
    }

    return this.server;
  }

  public async init(): Promise<void> {
    this.logger.info('Initializing REST application...');

    const server = this.getServer();
    const port = this.config.get('PORT');
    server.listen(port, () => {
      this.logger.info(`Server started on http://localhost:${port}`);
    });
  }
}
