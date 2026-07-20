import { injectable } from 'inversify';
import { pino, type Logger as PinoInstance } from 'pino';

import type { Logger } from './logger.interface.js';

@injectable()
export class PinoLogger implements Logger {
  private readonly logger: PinoInstance;

  constructor() {
    this.logger = pino({
      transport: {
        target: 'pino-pretty',
      },
    });
  }

  public info(message: string, ...args: unknown[]): void {
    this.logger.info(args, message);
  }

  public warn(message: string, ...args: unknown[]): void {
    this.logger.warn(args, message);
  }

  public error(message: string, error: Error, ...args: unknown[]): void {
    this.logger.error({ err: error, args }, message);
  }

  public debug(message: string, ...args: unknown[]): void {
    this.logger.debug(args, message);
  }
}
