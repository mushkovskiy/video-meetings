import { access, readdir } from 'node:fs/promises';
import path from 'node:path';

import { StatusCodes } from 'http-status-codes';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createMeeting } from '../helpers/create-meeting.js';
import { createTestApp } from '../helpers/create-test-app.js';
import { registerAndLogin } from '../helpers/register-and-login.js';
import { startTestDatabase, stopTestDatabase } from '../setup/mongo-memory-server.js';
import { startTestUploadDirectory, stopTestUploadDirectory } from '../setup/upload-directory.js';

const MAX_RECORDING_SIZE = 1024;
const NOT_FOUND_ID = '000000000000000000000000';

const recordingUrl = (meetingId: string) => `/meetings/${meetingId}/recording`;

const formats = [
  { name: 'meeting.mp3', mimeType: 'audio/mpeg' },
  { name: 'meeting.wav', mimeType: 'audio/x-wav' },
  { name: 'meeting.m4a', mimeType: 'audio/x-m4a' },
  { name: 'meeting.mp4', mimeType: 'video/mp4' },
  { name: 'meeting.webm', mimeType: 'video/webm' },
];

describe('POST /meetings/:meetingId/recording (e2e)', () => {
  let app: ReturnType<typeof createTestApp>;
  let uploadDirectory: string;

  const upload = (
    token: string,
    meetingId: string,
    content: Buffer,
    filename: string,
    type: string,
  ) =>
    request(app)
      .post(recordingUrl(meetingId))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', content, { filename, contentType: type });

  const countStoredFiles = async (meetingId: string): Promise<number> => {
    try {
      return (await readdir(path.join(uploadDirectory, 'recordings', meetingId))).length;
    } catch {
      return 0;
    }
  };

  beforeAll(async () => {
    await startTestDatabase('recordings-upload-e2e');
    uploadDirectory = await startTestUploadDirectory(MAX_RECORDING_SIZE);
    app = createTestApp();
  });

  afterAll(async () => {
    await stopTestDatabase();
    await stopTestUploadDirectory();
  });

  it.each(formats)('accepts a $name file and sets the status to processing', async (format) => {
    const { token } = await registerAndLogin(app);
    const meetingId = await createMeeting(app, token);
    const content = Buffer.alloc(256, 1);

    const response = await upload(token, meetingId, content, format.name, format.mimeType);

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body).toMatchObject({
      originalName: format.name,
      size: content.length,
      status: 'processing',
    });
    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body.uploadedAt).toEqual(expect.any(String));
    expect(response.body).not.toHaveProperty('storedName');
    expect(response.body).not.toHaveProperty('transcript');
  });

  it('stores the file in UPLOAD_DIRECTORY under a server-generated name', async () => {
    const { token } = await registerAndLogin(app);
    const meetingId = await createMeeting(app, token);

    await upload(token, meetingId, Buffer.alloc(64, 2), 'my notes.mp3', 'audio/mpeg');

    const [storedName] = await readdir(path.join(uploadDirectory, 'recordings', meetingId));

    expect(storedName).toMatch(/^[0-9a-f]{24}\.mp3$/);
    await expect(
      access(path.join(uploadDirectory, 'recordings', meetingId, storedName)),
    ).resolves.toBeUndefined();
  });

  it('keeps a non-ASCII original file name intact', async () => {
    const { token } = await registerAndLogin(app);
    const meetingId = await createMeeting(app, token);

    const response = await upload(token, meetingId, Buffer.alloc(64), 'Встреча.mp3', 'audio/mpeg');

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.originalName).toBe('Встреча.mp3');
  });

  it('accepts an upper-case extension', async () => {
    const { token } = await registerAndLogin(app);
    const meetingId = await createMeeting(app, token);

    const response = await upload(token, meetingId, Buffer.alloc(64), 'MEETING.MP3', 'audio/mpeg');

    expect(response.status).toBe(StatusCodes.CREATED);
  });

  it('rejects a file over the size limit with 413 and leaves nothing on disk', async () => {
    const { token } = await registerAndLogin(app);
    const meetingId = await createMeeting(app, token);

    const response = await upload(
      token,
      meetingId,
      Buffer.alloc(MAX_RECORDING_SIZE + 1),
      'big.mp3',
      'audio/mpeg',
    );

    expect(response.status).toBe(StatusCodes.REQUEST_TOO_LONG);
    expect(await countStoredFiles(meetingId)).toBe(0);
  });

  it('rejects a .pdf file with 400 and a clear message', async () => {
    const { token } = await registerAndLogin(app);
    const meetingId = await createMeeting(app, token);

    const response = await upload(token, meetingId, Buffer.alloc(64), 'doc.pdf', 'application/pdf');

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body.message).toContain('Неподдерживаемый формат');
    expect(response.body.message).toContain('mp3, wav, m4a, mp4, webm');
    expect(await countStoredFiles(meetingId)).toBe(0);
  });

  it('rejects an allowed extension with a foreign content type', async () => {
    const { token } = await registerAndLogin(app);
    const meetingId = await createMeeting(app, token);

    const response = await upload(token, meetingId, Buffer.alloc(64), 'fake.mp3', 'image/png');

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('rejects a request without a file with 400', async () => {
    const { token } = await registerAndLogin(app);
    const meetingId = await createMeeting(app, token);

    const response = await request(app)
      .post(recordingUrl(meetingId))
      .set('Authorization', `Bearer ${token}`)
      .field('note', 'no file here');

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('rejects a second upload for the same meeting and removes the extra file', async () => {
    const { token } = await registerAndLogin(app);
    const meetingId = await createMeeting(app, token);

    await upload(token, meetingId, Buffer.alloc(64), 'first.mp3', 'audio/mpeg');
    const response = await upload(token, meetingId, Buffer.alloc(64), 'second.mp3', 'audio/mpeg');

    expect(response.status).toBe(StatusCodes.CONFLICT);
    expect(await countStoredFiles(meetingId)).toBe(1);
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app)
      .post(recordingUrl(NOT_FOUND_ID))
      .attach('file', Buffer.alloc(64), { filename: 'a.mp3', contentType: 'audio/mpeg' });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  it('rejects an invalid meeting id format', async () => {
    const { token } = await registerAndLogin(app);

    const response = await upload(token, 'not-a-valid-id', Buffer.alloc(64), 'a.mp3', 'audio/mpeg');

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('returns not found for a non-existent meeting', async () => {
    const { token } = await registerAndLogin(app);

    const response = await upload(token, NOT_FOUND_ID, Buffer.alloc(64), 'a.mp3', 'audio/mpeg');

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
  });

  it('rejects an upload to another user\'s meeting without writing a file', async () => {
    const owner = await registerAndLogin(app);
    const otherUser = await registerAndLogin(app);
    const meetingId = await createMeeting(app, owner.token);

    const response = await upload(
      otherUser.token,
      meetingId,
      Buffer.alloc(64),
      'a.mp3',
      'audio/mpeg',
    );

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
    expect(await countStoredFiles(meetingId)).toBe(0);
  });
});
