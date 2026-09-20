import type { DocumentType } from '@typegoose/typegoose';
import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'inversify';

import { fillDTO } from '../../helpers/common.helper.js';
import type { Logger } from '../../libs/logger/logger.interface.js';
import { PrivateRouteMiddleware } from '../../libs/middleware/private-route.middleware.js';
import { ValidateDtoMiddleware } from '../../libs/middleware/validate-dto.middleware.js';
import { ValidateObjectIdMiddleware } from '../../libs/middleware/validate-object-id.middleware.js';
import { BaseController } from '../../libs/rest/base-controller.abstract.js';
import { HttpError } from '../../libs/rest/errors/http-error.js';
import { HttpMethod } from '../../libs/rest/http-method.enum.js';
import { Component } from '../../types/component.type.js';
import { CreateMeetingDto } from './dto/create-meeting.dto.js';
import type { MeetingService } from './meeting-service.interface.js';
import type { MeetingEntity } from './meeting.entity.js';
import { MeetingRdo } from './rdo/meeting.rdo.js';

@injectable()
export class MeetingController extends BaseController {
  constructor(
    @inject(Component.Logger) logger: Logger,
    @inject(Component.MeetingService) private readonly meetingService: MeetingService,
  ) {
    super(logger);

    this.addRoute({
      path: '/',
      method: HttpMethod.Post,
      handler: this.create,
      middlewares: [new PrivateRouteMiddleware(), new ValidateDtoMiddleware(CreateMeetingDto)],
    });

    this.addRoute({
      path: '/',
      method: HttpMethod.Get,
      handler: this.index,
      middlewares: [new PrivateRouteMiddleware()],
    });

    this.addRoute({
      path: '/:meetingId',
      method: HttpMethod.Get,
      handler: this.show,
      middlewares: [new PrivateRouteMiddleware(), new ValidateObjectIdMiddleware('meetingId')],
    });
  }

  private toRdo(meeting: DocumentType<MeetingEntity>): MeetingRdo {
    return fillDTO(MeetingRdo, {
      id: meeting.id as string,
      title: meeting.title,
      description: meeting.description,
      scheduledAt: meeting.scheduledAt,
    });
  }

  public create = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as CreateMeetingDto;
    const ownerId = req.tokenPayload!.id;

    const meeting = await this.meetingService.create(dto, ownerId);

    this.created(res, this.toRdo(meeting));
  };

  public index = async (req: Request, res: Response): Promise<void> => {
    const ownerId = req.tokenPayload!.id;
    const meetings = await this.meetingService.findAllByOwner(ownerId);

    this.ok(
      res,
      meetings.map((meeting) => this.toRdo(meeting)),
    );
  };

  public show = async (req: Request, res: Response): Promise<void> => {
    const ownerId = req.tokenPayload!.id;
    const meeting = await this.meetingService.findById(req.params.meetingId);

    if (!meeting) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        `Meeting with id "${req.params.meetingId}" not found.`,
      );
    }

    if (meeting.ownerId !== ownerId) {
      throw new HttpError(StatusCodes.FORBIDDEN, 'You do not have access to this meeting.');
    }

    this.ok(res, this.toRdo(meeting));
  };
}
