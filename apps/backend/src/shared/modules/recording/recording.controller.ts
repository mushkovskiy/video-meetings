import { rm } from 'node:fs/promises';
import path from 'node:path';

import type { DocumentType } from '@typegoose/typegoose';
import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'inversify';

import { fillDTO } from '../../helpers/common.helper.js';
import type { Config } from '../../libs/config/config.interface.js';
import type { RestSchema } from '../../libs/config/rest.schema.js';
import type { Logger } from '../../libs/logger/logger.interface.js';
import { MeetingOwnerMiddleware } from '../../libs/middleware/meeting-owner.middleware.js';
import { PrivateRouteMiddleware } from '../../libs/middleware/private-route.middleware.js';
import { UploadFileMiddleware } from '../../libs/middleware/upload-file.middleware.js';
import { ValidateObjectIdMiddleware } from '../../libs/middleware/validate-object-id.middleware.js';
import { BaseController } from '../../libs/rest/base-controller.abstract.js';
import { HttpError } from '../../libs/rest/errors/http-error.js';
import { HttpMethod } from '../../libs/rest/http-method.enum.js';
import { Component } from '../../types/component.type.js';
import type { MeetingService } from '../meeting/meeting-service.interface.js';
import { RecordingRdo } from './rdo/recording.rdo.js';
import type { RecordingService } from './recording-service.interface.js';
import type { RecordingEntity } from './recording.entity.js';
import { RecordingStatus } from './recording.entity.js';
import type { TranscriptionQueue } from './transcription-queue.interface.js';

const RECORDINGS_DIRECTORY = 'recordings';
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4', '.webm'];

// Browsers report different content types for the same format, so the extension
// is the primary check; the MIME type only rejects clearly foreign content.
const isRecordingMimeType = (mimeType: string): boolean =>
  mimeType.startsWith('audio/') ||
  mimeType === 'video/mp4' ||
  mimeType === 'video/webm' ||
  mimeType === 'application/octet-stream';

@injectable()
export class RecordingController extends BaseController {
  private readonly uploadDirectory: string;

  constructor(
    @inject(Component.Logger) logger: Logger,
    @inject(Component.Config) config: Config<RestSchema>,
    @inject(Component.MeetingService) meetingService: MeetingService,
    @inject(Component.RecordingService) private readonly recordingService: RecordingService,
    @inject(Component.TranscriptionQueue) private readonly transcriptionQueue: TranscriptionQueue,
  ) {
    super(logger);

    this.uploadDirectory = path.resolve(config.get('UPLOAD_DIRECTORY'));

    const meetingOwner = new MeetingOwnerMiddleware(meetingService, 'meetingId');

    this.addRoute({
      path: '/:meetingId/recording',
      method: HttpMethod.Post,
      handler: this.upload,
      middlewares: [
        new PrivateRouteMiddleware(),
        new ValidateObjectIdMiddleware('meetingId'),
        meetingOwner,
        new UploadFileMiddleware({
          directory: (req) =>
            path.join(this.uploadDirectory, RECORDINGS_DIRECTORY, req.params.meetingId),
          fieldName: 'file',
          maxFileSize: config.get('UPLOAD_MAX_RECORDING_SIZE'),
          allowedExtensions: ALLOWED_EXTENSIONS,
          isMimeTypeAllowed: isRecordingMimeType,
        }),
      ],
    });

    this.addRoute({
      path: '/:meetingId/recording',
      method: HttpMethod.Get,
      handler: this.show,
      middlewares: [
        new PrivateRouteMiddleware(),
        new ValidateObjectIdMiddleware('meetingId'),
        meetingOwner,
      ],
    });
  }

  private toRdo(recording: DocumentType<RecordingEntity>): RecordingRdo {
    return fillDTO(RecordingRdo, {
      id: recording.id as string,
      originalName: recording.originalName,
      size: recording.size,
      mimeType: recording.mimeType,
      status: recording.status,
      uploadedAt: recording.createdAt,
      transcript: recording.status === RecordingStatus.Done ? recording.transcript : undefined,
      failureReason:
        recording.status === RecordingStatus.Failed ? recording.failureReason : undefined,
    });
  }

  public upload = async (req: Request, res: Response): Promise<void> => {
    const file = req.file!;
    const { meetingId } = req.params;

    try {
      const existing = await this.recordingService.findByMeetingId(meetingId);

      if (existing) {
        // Replacing a healthy recording is a later phase and stays a conflict until then;
        // a failed one can be re-uploaded so the user is not stuck with it.
        if (existing.status !== RecordingStatus.Failed) {
          throw new HttpError(StatusCodes.CONFLICT, 'This meeting already has a recording.');
        }

        await this.recordingService.deleteById(existing.id as string);
        await rm(path.join(this.uploadDirectory, existing.storedName), { force: true });
      }

      const recording = await this.recordingService.create({
        meetingId,
        ownerId: req.tokenPayload!.id,
        originalName: file.originalname,
        storedName: path.relative(this.uploadDirectory, file.path).split(path.sep).join('/'),
        mimeType: file.mimetype,
        size: file.size,
        status: RecordingStatus.Processing,
      });

      // Transcription runs in the background; the response does not wait for it.
      this.transcriptionQueue.enqueue(recording.id as string);

      this.created(res, this.toRdo(recording));
    } catch (error) {
      // Don't leave an orphaned file behind if the metadata wasn't saved.
      await rm(file.path, { force: true });
      throw error;
    }
  };

  public show = async (req: Request, res: Response): Promise<void> => {
    const recording = await this.recordingService.findByMeetingId(req.params.meetingId);

    if (!recording) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'This meeting has no recording.');
    }

    this.ok(res, this.toRdo(recording));
  };
}
