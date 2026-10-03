import express, { type Express } from 'express';
import { inject, injectable } from 'inversify';

import { getMongoURI } from '../shared/helpers/database.helper.js';
import type { Config } from '../shared/libs/config/config.interface.js';
import type { RestSchema } from '../shared/libs/config/rest.schema.js';
import type { DatabaseClient } from '../shared/libs/database/database-client.interface.js';
import type { Logger } from '../shared/libs/logger/logger.interface.js';
import { ParseTokenMiddleware } from '../shared/libs/middleware/parse-token.middleware.js';
import type { ExceptionFilter } from '../shared/libs/rest/exception-filter.interface.js';
import type { MeetingController } from '../shared/modules/meeting/meeting.controller.js';
import type { RecordingController } from '../shared/modules/recording/recording.controller.js';
import type { UserController } from '../shared/modules/user/user.controller.js';
import { Component } from '../shared/types/component.type.js';

@injectable()
export class RestApplication {
  private readonly server: Express;
  private isBootstrapped = false;
  private dbConnectionPromise: Promise<void> | null = null;

  constructor(
    @inject(Component.Logger) private readonly logger: Logger,
    @inject(Component.Config) private readonly config: Config<RestSchema>,
    @inject(Component.DatabaseClient) private readonly databaseClient: DatabaseClient,
    @inject(Component.AppExceptionFilter) private readonly appExceptionFilter: ExceptionFilter,
    @inject(Component.UserController) private readonly userController: UserController,
    @inject(Component.MeetingController) private readonly meetingController: MeetingController,
    @inject(Component.RecordingController)
    private readonly recordingController: RecordingController,
  ) {
    this.server = express();
  }

  private registerMiddlewares(): void {
    const parseTokenMiddleware = new ParseTokenMiddleware(this.config.get('JWT_SECRET'));

    this.server.use(express.json());
    this.server.use(parseTokenMiddleware.execute.bind(parseTokenMiddleware));
  }

  private registerRoutes(): void {
    this.server.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    this.server.use('/users', this.userController.router);
    this.server.use('/meetings', this.meetingController.router);
    this.server.use('/meetings', this.recordingController.router);
  }

  private registerExceptionFilters(): void {
    this.server.use(this.appExceptionFilter.catch.bind(this.appExceptionFilter));
  }

  private connectToDatabase(): Promise<void> {
    if (!this.dbConnectionPromise) {
      const uri = getMongoURI(
        this.config.get('DB_MONGO_HOST'),
        this.config.get('DB_MONGO_PORT'),
        this.config.get('DB_MONGO_NAME'),
        this.config.get('DB_MONGO_USER'),
        this.config.get('DB_MONGO_PASSWORD'),
      );

      this.dbConnectionPromise = this.databaseClient.connect(uri).catch((error: unknown) => {
        this.logger.error('Failed to connect to the database', error as Error);
        throw error;
      });
    }

    return this.dbConnectionPromise;
  }

  // Lets supertest exercise the app without binding a real port.
  public getServer(): Express {
    if (!this.isBootstrapped) {
      this.registerMiddlewares();
      this.registerRoutes();
      this.registerExceptionFilters();
      this.isBootstrapped = true;
      void this.connectToDatabase();
    }

    return this.server;
  }

  public async init(): Promise<void> {
    this.logger.info('Initializing REST application...');

    await this.connectToDatabase();

    const server = this.getServer();
    const port = this.config.get('PORT');
    server.listen(port, () => {
      this.logger.info(`Server started on http://localhost:${port}`);
    });
  }
}
