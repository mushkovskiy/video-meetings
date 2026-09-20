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

  private handleHttpError(error: HttpError, _req: Request, res: Response): void {
    res.status(error.httpStatusCode).json({
      errorType: 'HTTP_ERROR',
      message: error.message,
      ...(error.detail ? { detail: error.detail } : {}),
    });
  }

  private handleOtherError(error: Error, _req: Request, res: Response): void {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      errorType: 'INTERNAL_SERVER_ERROR',
      message: error.message,
    });
  }

  // The unused `next` parameter is required so Express recognizes this as
  // error-handling middleware (it dispatches based on handler arity === 4).
  public catch(error: Error, req: Request, res: Response, next: NextFunction): void {
    void next;
    this.logger.error(error.message, error);

    if (error instanceof HttpError) {
      this.handleHttpError(error, req, res);
      return;
    }

    this.handleOtherError(error, req, res);
  }
}
