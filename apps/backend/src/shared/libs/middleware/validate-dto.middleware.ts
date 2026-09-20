import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { HttpError } from '../rest/errors/http-error.js';
import type { Middleware } from './middleware.interface.js';

export class ValidateDtoMiddleware implements Middleware {
  constructor(private readonly dto: ClassConstructor<object>) {}

  public async execute(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const instance = plainToInstance(this.dto, req.body);
    const errors = await validate(instance);

    if (errors.length > 0) {
      const detail = errors.flatMap((error) => Object.values(error.constraints ?? {})).join('; ');

      next(new HttpError(StatusCodes.BAD_REQUEST, 'Validation error', detail));
      return;
    }

    next();
  }
}
