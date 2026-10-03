import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import multer, { MulterError } from 'multer';

import { HttpError } from '../rest/errors/http-error.js';
import type { Middleware } from './middleware.interface.js';

export interface UploadFileOptions {
  directory: (req: Request) => string;
  fieldName: string;
  maxFileSize: number;
  allowedExtensions: string[];
  // Secondary check on the reported content type (the extension is the primary one).
  isMimeTypeAllowed?: (mimeType: string) => boolean;
}

const MIB = 1024 * 1024;

const formatLimit = (bytes: number): string =>
  bytes % MIB === 0 ? `${bytes / MIB} МБ` : `${bytes} байт`;

export class UploadFileMiddleware implements Middleware {
  private readonly upload: RequestHandler;

  constructor(private readonly options: UploadFileOptions) {
    const { allowedExtensions, isMimeTypeAllowed, fieldName, maxFileSize } = options;

    const storage = multer.diskStorage({
      destination: (req, _file, callback) => {
        const directory = options.directory(req);

        mkdir(directory, { recursive: true }).then(
          () => callback(null, directory),
          (error: Error) => callback(error, directory),
        );
      },
      // The client-supplied name is never used for the path (traversal, collisions).
      filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();

        callback(null, `${new Types.ObjectId().toHexString()}${extension}`);
      },
    });

    this.upload = multer({
      storage,
      // busboy decodes `filename` as latin1 by default, which garbles non-ASCII names.
      defParamCharset: 'utf8',
      limits: { fileSize: maxFileSize, files: 1, fields: 5 },
      fileFilter: (_req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const isExtensionAllowed = allowedExtensions.includes(extension);
        const isMimeAllowed = isMimeTypeAllowed ? isMimeTypeAllowed(file.mimetype) : true;

        if (!isExtensionAllowed || !isMimeAllowed) {
          const formats = allowedExtensions.map((item) => item.slice(1)).join(', ');

          callback(
            new HttpError(
              StatusCodes.BAD_REQUEST,
              `Неподдерживаемый формат. Допустимы: ${formats}`,
            ),
          );
          return;
        }

        callback(null, true);
      },
    }).single(fieldName);
  }

  public execute(req: Request, res: Response, next: NextFunction): Promise<void> {
    return new Promise((resolve, reject) => {
      this.upload(req, res, (error: unknown) => {
        if (error) {
          reject(this.toHttpError(error));
          return;
        }

        if (!req.file) {
          reject(
            new HttpError(
              StatusCodes.BAD_REQUEST,
              `Файл не передан. Ожидается multipart-поле "${this.options.fieldName}".`,
            ),
          );
          return;
        }

        next();
        resolve();
      });
    });
  }

  private toHttpError(error: unknown): unknown {
    if (!(error instanceof MulterError)) {
      return error;
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return new HttpError(
        StatusCodes.REQUEST_TOO_LONG,
        `Файл больше ${formatLimit(this.options.maxFileSize)}`,
      );
    }

    return new HttpError(StatusCodes.BAD_REQUEST, error.message);
  }
}
