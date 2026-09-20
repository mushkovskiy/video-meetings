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

describe('GET /meetings/:id (e2e)', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    await startTestDatabase('meetings-get-by-id-e2e');
    app = createTestApp();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).get(`${MEETINGS_URL}/000000000000000000000000`);

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  it('returns a meeting owned by the authenticated user', async () => {
    const { token } = await registerAndLogin(app);

    const createResponse = await request(app)
      .post(MEETINGS_URL)
      .set('Authorization', `Bearer ${token}`)
      .send(validMeeting());

    const response = await request(app)
      .get(`${MEETINGS_URL}/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toMatchObject({
      id: createResponse.body.id,
      title: createResponse.body.title,
    });
  });

  it('rejects access to a meeting owned by another user', async () => {
    const owner = await registerAndLogin(app);
    const otherUser = await registerAndLogin(app);

    const createResponse = await request(app)
      .post(MEETINGS_URL)
      .set('Authorization', `Bearer ${owner.token}`)
      .send(validMeeting());

    const response = await request(app)
      .get(`${MEETINGS_URL}/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${otherUser.token}`);

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });

  it('returns not found for a non-existent meeting id', async () => {
    const { token } = await registerAndLogin(app);

    const response = await request(app)
      .get(`${MEETINGS_URL}/000000000000000000000000`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
  });

  it('rejects an invalid meeting id format', async () => {
    const { token } = await registerAndLogin(app);

    const response = await request(app)
      .get(`${MEETINGS_URL}/not-a-valid-id`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });
});
