import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'inversify';
import { SignJWT } from 'jose';
import { createSecretKey } from 'node:crypto';

import { fillDTO } from '../../helpers/common.helper.js';
import type { Config } from '../../libs/config/config.interface.js';
import type { RestSchema } from '../../libs/config/rest.schema.js';
import type { Logger } from '../../libs/logger/logger.interface.js';
import { ValidateDtoMiddleware } from '../../libs/middleware/validate-dto.middleware.js';
import { BaseController } from '../../libs/rest/base-controller.abstract.js';
import { HttpError } from '../../libs/rest/errors/http-error.js';
import { HttpMethod } from '../../libs/rest/http-method.enum.js';
import { Component } from '../../types/component.type.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { LoggedUserRdo } from './rdo/logged-user.rdo.js';
import { UserRdo } from './rdo/user.rdo.js';
import type { UserService } from './user-service.interface.js';

const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRES_IN = '2d';

@injectable()
export class UserController extends BaseController {
  constructor(
    @inject(Component.Logger) logger: Logger,
    @inject(Component.UserService) private readonly userService: UserService,
    @inject(Component.Config) private readonly config: Config<RestSchema>,
  ) {
    super(logger);

    this.addRoute({
      path: '/register',
      method: HttpMethod.Post,
      handler: this.register,
      middlewares: [new ValidateDtoMiddleware(CreateUserDto)],
    });

    this.addRoute({
      path: '/login',
      method: HttpMethod.Post,
      handler: this.login,
      middlewares: [new ValidateDtoMiddleware(LoginUserDto)],
    });
  }

  public register = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as CreateUserDto;
    const existingUser = await this.userService.findByEmail(dto.email);

    if (existingUser) {
      throw new HttpError(StatusCodes.CONFLICT, `User with email "${dto.email}" already exists.`);
    }

    const salt = this.config.get('SALT');
    const user = await this.userService.create(dto, salt);

    this.created(
      res,
      fillDTO(UserRdo, {
        id: user.id as string,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      }),
    );
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as LoginUserDto;
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new HttpError(StatusCodes.NOT_FOUND, `User with email "${dto.email}" not found.`);
    }

    const salt = this.config.get('SALT');

    if (!user.verifyPassword(dto.password, salt)) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Incorrect password.');
    }

    const token = await new SignJWT({ email: user.email, id: user.id as string })
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRES_IN)
      .sign(createSecretKey(Buffer.from(this.config.get('JWT_SECRET'))));

    this.ok(res, fillDTO(LoggedUserRdo, { email: user.email, token }));
  };
}
