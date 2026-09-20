import type { Request, Response } from 'express';
import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { StatusCodes } from 'http-status-codes';
import { injectable } from 'inversify';

import type { Logger } from '../logger/logger.interface.js';
import type { Middleware } from '../middleware/middleware.interface.js';
import type { HttpMethod } from './http-method.enum.js';

export type RouteHandler = (req: Request, res: Response) => void | Promise<void>;

export interface RouteConfig {
  path: string;
  method: HttpMethod;
  handler: RouteHandler;
  middlewares?: Middleware[];
}

@injectable()
export abstract class BaseController {
  private readonly _router: Router;

  constructor(protected readonly logger: Logger) {
    this._router = Router();
  }

  public get router(): Router {
    return this._router;
  }

  public addRoute(route: RouteConfig): void {
    const middlewareHandlers = (route.middlewares ?? []).map((middleware) =>
      asyncHandler(middleware.execute.bind(middleware)),
    );
    const routeHandler = asyncHandler(route.handler);

    this._router[route.method](route.path, ...middlewareHandlers, routeHandler);
  }

  public send(res: Response, statusCode: number, data: unknown): void {
    res.status(statusCode).json(data);
  }

  public created(res: Response, data: unknown): void {
    this.send(res, StatusCodes.CREATED, data);
  }

  public ok(res: Response, data: unknown): void {
    this.send(res, StatusCodes.OK, data);
  }

  public noContent(res: Response): void {
    res.status(StatusCodes.NO_CONTENT).end();
  }
}
