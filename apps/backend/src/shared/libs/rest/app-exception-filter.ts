import type { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { StatusCodes } from 'http-status-codes';

import { Component } from '../../types/component.type.js';
import type { Logger } from '../logger/logger.interface.js';
import { HttpError } from './errors/http-error.js';
import type { ExceptionFilter } from './exception-filter.interface.js';

@injectable()
export class AppExceptionFilter implements ExceptionFilter {
  constructor(@inject(Component.Logger) private readonly logger: Logger) {}

  private handleHttpError(error: HttpError, req: Request, res: Response): void {
    // A 4xx HttpError is an expected, client-caused outcome (bad input, missing
    // resource, conflict, ...) — log it as a warning so real failures (5xx)
    // aren't drowned out in noise that looks like a crash.
    const logMessage = `${req.method} ${req.originalUrl} -> ${error.httpStatusCode} ${error.message}`;

    if (error.httpStatusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
      this.logger.error(logMessage, error);
    } else {
      this.logger.warn(logMessage);
    }

    res.status(error.httpStatusCode).json({
      errorType: 'HTTP_ERROR',
      message: error.message,
      ...(error.detail ? { detail: error.detail } : {}),
    });
  }

  private handleOtherError(error: Error, req: Request, res: Response): void {
    this.logger.error(`${req.method} ${req.originalUrl} -> unhandled error`, error);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      errorType: 'INTERNAL_SERVER_ERROR',
      message: error.message,
    });
  }

  // The unused `next` parameter is required so Express recognizes this as
  // error-handling middleware (it dispatches based on handler arity === 4).
  public catch(error: Error, req: Request, res: Response, next: NextFunction): void {
    void next;

    if (error instanceof HttpError) {
      this.handleHttpError(error, req, res);
      return;
    }

    this.handleOtherError(error, req, res);
  }
}
