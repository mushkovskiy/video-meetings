import { inject, injectable } from 'inversify';
import mongoose from 'mongoose';

import { Component } from '../../types/component.type.js';
import type { Logger } from '../logger/logger.interface.js';
import type { DatabaseClient } from './database-client.interface.js';

@injectable()
export class MongoDatabaseClient implements DatabaseClient {
  private isConnected = false;

  constructor(@inject(Component.Logger) private readonly logger: Logger) {}

  public async connect(uri: string): Promise<void> {
    if (this.isConnected) {
      this.logger.warn('MongoDB client is already connected.');
      return;
    }

    this.logger.info('Connecting to MongoDB...');
    await mongoose.connect(uri);
    this.isConnected = true;
    this.logger.info('MongoDB connection established.');
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    await mongoose.disconnect();
    this.isConnected = false;
  }
}
