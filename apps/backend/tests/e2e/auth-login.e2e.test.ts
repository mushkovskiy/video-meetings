import { StatusCodes } from 'http-status-codes';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from '../helpers/create-test-app.js';
import { startTestDatabase, stopTestDatabase } from '../setup/mongo-memory-server.js';

const REGISTER_URL = '/users/register';
const LOGIN_URL = '/users/login';

let uniqueEmailCounter = 0;
const uniqueEmail = () => `john.smith.${++uniqueEmailCounter}@example.com`;

const registerUser = async (
  app: ReturnType<typeof createTestApp>,
  overrides: Partial<Record<'email' | 'password', string>> = {},
) => {
  const user = {
    email: uniqueEmail(),
    firstName: 'John',
    lastName: 'Smith',
    password: 'super-secret-1',
    ...overrides,
  };

  await request(app).post(REGISTER_URL).send(user);

  return user;
};

describe('POST /users/login (e2e)', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    await startTestDatabase('auth-login-e2e');
    app = createTestApp();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  it('logs in a registered user and returns a JWT', async () => {
    const user = await registerUser(app);

    const response = await request(app)
      .post(LOGIN_URL)
      .send({ email: user.email, password: user.password });

    expect(response.status).toBe(StatusCodes.OK);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.token.length).toBeGreaterThan(0);
    expect(response.body).toMatchObject({ email: user.email });
    expect(response.body.password).toBeUndefined();
  });

  it('rejects login with an incorrect password', async () => {
    const user = await registerUser(app);

    const response = await request(app)
      .post(LOGIN_URL)
      .send({ email: user.email, password: 'wrong-password' });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  it('rejects login for an email that was never registered', async () => {
    const response = await request(app)
      .post(LOGIN_URL)
      .send({ email: uniqueEmail(), password: 'super-secret-1' });

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
  });

  it('rejects login when the request body fails validation', async () => {
    const response = await request(app).post(LOGIN_URL).send({ email: 'not-an-email' });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });
});
