import { StatusCodes } from 'http-status-codes';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createMeeting } from '../helpers/create-meeting.js';
import { createTestApp } from '../helpers/create-test-app.js';
import { registerAndLogin } from '../helpers/register-and-login.js';
import { startTestDatabase, stopTestDatabase } from '../setup/mongo-memory-server.js';
import { startTestUploadDirectory, stopTestUploadDirectory } from '../setup/upload-directory.js';

const NOT_FOUND_ID = '000000000000000000000000';

const recordingUrl = (meetingId: string) => `/meetings/${meetingId}/recording`;

describe('GET /meetings/:meetingId/recording (e2e)', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    await startTestDatabase('recordings-get-e2e');
    await startTestUploadDirectory();
    app = createTestApp();
  });

  afterAll(async () => {
    await stopTestDatabase();
    await stopTestUploadDirectory();
  });

  it('returns the metadata and status of an uploaded recording', async () => {
    const { token } = await registerAndLogin(app);
    const meetingId = await createMeeting(app, token);
    const content = Buffer.alloc(128, 3);

    const uploadResponse = await request(app)
      .post(recordingUrl(meetingId))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', content, { filename: 'standup.m4a', contentType: 'audio/mp4' });

    const response = await request(app)
      .get(recordingUrl(meetingId))
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toMatchObject({
      id: uploadResponse.body.id,
      originalName: 'standup.m4a',
      mimeType: 'audio/mp4',
      size: content.length,
      status: 'processing',
      uploadedAt: uploadResponse.body.uploadedAt,
    });
    expect(response.body).not.toHaveProperty('storedName');
    expect(response.body).not.toHaveProperty('transcript');
  });

  it('returns not found when the meeting has no recording', async () => {
    const { token } = await registerAndLogin(app);
    const meetingId = await createMeeting(app, token);

    const response = await request(app)
      .get(recordingUrl(meetingId))
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).get(recordingUrl(NOT_FOUND_ID));

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  it('rejects an invalid meeting id format', async () => {
    const { token } = await registerAndLogin(app);

    const response = await request(app)
      .get(recordingUrl('not-a-valid-id'))
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('returns not found for a non-existent meeting', async () => {
    const { token } = await registerAndLogin(app);

    const response = await request(app)
      .get(recordingUrl(NOT_FOUND_ID))
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
  });

  it('rejects access to another user\'s recording', async () => {
    const owner = await registerAndLogin(app);
    const otherUser = await registerAndLogin(app);
    const meetingId = await createMeeting(app, owner.token);

    await request(app)
      .post(recordingUrl(meetingId))
      .set('Authorization', `Bearer ${owner.token}`)
      .attach('file', Buffer.alloc(64), { filename: 'a.mp3', contentType: 'audio/mpeg' });

    const response = await request(app)
      .get(recordingUrl(meetingId))
      .set('Authorization', `Bearer ${otherUser.token}`);

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });
});
