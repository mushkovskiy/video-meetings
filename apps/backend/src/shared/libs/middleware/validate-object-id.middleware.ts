import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';

import { HttpError } from '../rest/errors/http-error.js';
import type { Middleware } from './middleware.interface.js';

export class ValidateObjectIdMiddleware implements Middleware {
  constructor(private readonly param: string) {}

  public execute(req: Request, _res: Response, next: NextFunction): void {
    const id = req.params[this.param];

    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(StatusCodes.BAD_REQUEST, `"${id}" is not a valid id.`);
    }

    next();
  }
}
