import { StatusCodes } from 'http-status-codes';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from '../helpers/create-test-app.js';
import { registerAndLogin } from '../helpers/register-and-login.js';
import { startTestDatabase, stopTestDatabase } from '../setup/mongo-memory-server.js';

const MEETINGS_URL = '/meetings';

const validMeeting = () => ({
  title: 'Sprint planning',
  description: 'Discuss the next sprint scope',
  scheduledAt: '2026-10-01T10:00:00.000Z',
});

describe('POST /meetings (e2e)', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    await startTestDatabase('meetings-create-e2e');
    app = createTestApp();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).post(MEETINGS_URL).send(validMeeting());

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  it('creates a new meeting for the authenticated user', async () => {
    const { token } = await registerAndLogin(app);
    const meeting = validMeeting();

    const response = await request(app)
      .post(MEETINGS_URL)
      .set('Authorization', `Bearer ${token}`)
      .send(meeting);

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body).toMatchObject({
      title: meeting.title,
      description: meeting.description,
      scheduledAt: meeting.scheduledAt,
    });
    expect(response.body.id).toBeDefined();
  });

  it('rejects a meeting without a title', async () => {
    const { token } = await registerAndLogin(app);
    const { title: _title, ...meetingWithoutTitle } = validMeeting();

    const response = await request(app)
      .post(MEETINGS_URL)
      .set('Authorization', `Bearer ${token}`)
      .send(meetingWithoutTitle);

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('rejects a meeting without scheduledAt', async () => {
    const { token } = await registerAndLogin(app);
    const { scheduledAt: _scheduledAt, ...meetingWithoutSchedule } = validMeeting();

    const response = await request(app)
      .post(MEETINGS_URL)
      .set('Authorization', `Bearer ${token}`)
      .send(meetingWithoutSchedule);

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('rejects a meeting with an invalid scheduledAt value', async () => {
    const { token } = await registerAndLogin(app);

    const response = await request(app)
      .post(MEETINGS_URL)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validMeeting(), scheduledAt: 'not-a-date' });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });
});
