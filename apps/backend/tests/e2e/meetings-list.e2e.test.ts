import { StatusCodes } from 'http-status-codes';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from '../helpers/create-test-app.js';
import { registerAndLogin } from '../helpers/register-and-login.js';
import { startTestDatabase, stopTestDatabase } from '../setup/mongo-memory-server.js';

const MEETINGS_URL = '/meetings';

const validMeeting = (title: string) => ({
  title,
  description: 'Discuss the next sprint scope',
  scheduledAt: '2026-10-01T10:00:00.000Z',
});

describe('GET /meetings (e2e)', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    await startTestDatabase('meetings-list-e2e');
    app = createTestApp();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).get(MEETINGS_URL);

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  it('returns an empty list when the authenticated user has no meetings', async () => {
    const { token } = await registerAndLogin(app);

    const response = await request(app).get(MEETINGS_URL).set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual([]);
  });

  it('returns only the meetings created by the authenticated user', async () => {
    const owner = await registerAndLogin(app);
    const otherUser = await registerAndLogin(app);

    await request(app)
      .post(MEETINGS_URL)
      .set('Authorization', `Bearer ${owner.token}`)
      .send(validMeeting('Owner meeting'));

    await request(app)
      .post(MEETINGS_URL)
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send(validMeeting('Other user meeting'));

    const response = await request(app)
      .get(MEETINGS_URL)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ title: 'Owner meeting' });
  });
});
