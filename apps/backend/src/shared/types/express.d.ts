import type { TokenPayload } from './token-payload.type.js';

declare global {
  namespace Express {
    interface Request {
      tokenPayload?: TokenPayload;
    }
  }
}

export {};
