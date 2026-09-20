import type { NextFunction, Request, Response } from 'express';
import { jwtVerify } from 'jose';
import { createSecretKey } from 'node:crypto';

import type { Middleware } from './middleware.interface.js';

export class ParseTokenMiddleware implements Middleware {
  constructor(private readonly jwtSecret: string) {}

  public async execute(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authorizationHeader.slice('Bearer '.length);

    try {
      const { payload } = await jwtVerify(token, createSecretKey(Buffer.from(this.jwtSecret)));

      req.tokenPayload = { email: payload.email as string, id: payload.id as string };
    } catch {
      // Missing/expired/malformed token: leave tokenPayload unset so
      // PrivateRouteMiddleware rejects the request as unauthenticated.
    }

    next();
  }
}
