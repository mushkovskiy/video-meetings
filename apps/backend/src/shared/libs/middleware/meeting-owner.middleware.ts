import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import type { MeetingService } from '../../modules/meeting/meeting-service.interface.js';
import { HttpError } from '../rest/errors/http-error.js';
import type { Middleware } from './middleware.interface.js';

// Resolves the meeting from `req.params[param]` and checks the authenticated
// user owns it (404 / 403). Runs before the upload middleware so a foreign
// user can't make the server write a file to disk. The meeting is exposed to
// handlers via `res.locals.meeting`.
export class MeetingOwnerMiddleware implements Middleware {
  constructor(
    private readonly meetingService: MeetingService,
    private readonly param: string,
  ) {}

  public async execute(req: Request, res: Response, next: NextFunction): Promise<void> {
    const meetingId = req.params[this.param];
    const meeting = await this.meetingService.findById(meetingId);

    if (!meeting) {
      throw new HttpError(StatusCodes.NOT_FOUND, `Meeting with id "${meetingId}" not found.`);
    }

    if (meeting.ownerId !== req.tokenPayload!.id) {
      throw new HttpError(StatusCodes.FORBIDDEN, 'You do not have access to this meeting.');
    }

    res.locals.meeting = meeting;
    next();
  }
}
