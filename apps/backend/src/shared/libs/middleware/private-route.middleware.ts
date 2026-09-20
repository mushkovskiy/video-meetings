import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { HttpError } from '../rest/errors/http-error.js';
import type { Middleware } from './middleware.interface.js';

export class PrivateRouteMiddleware implements Middleware {
  public execute(req: Request, _res: Response, next: NextFunction): void {
    if (!req.tokenPayload) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Authorization required.');
    }

    next();
  }
}
