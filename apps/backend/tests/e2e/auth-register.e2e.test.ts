import { StatusCodes } from 'http-status-codes';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from '../helpers/create-test-app.js';
import { startTestDatabase, stopTestDatabase } from '../setup/mongo-memory-server.js';

const REGISTER_URL = '/users/register';

let uniqueEmailCounter = 0;
const uniqueEmail = () => `jane.doe.${++uniqueEmailCounter}@example.com`;

const validUser = () => ({
  email: uniqueEmail(),
  firstName: 'Jane',
  lastName: 'Doe',
  password: 'super-secret-1',
});

describe('POST /users/register (e2e)', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    await startTestDatabase('auth-register-e2e');
    app = createTestApp();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  it('creates a new user and returns it without the password', async () => {
    const user = validUser();
    const response = await request(app).post(REGISTER_URL).send(user);

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body).toMatchObject({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    expect(response.body.id).toBeDefined();
    expect(response.body.password).toBeUndefined();
  });

  it('rejects registration with an invalid email', async () => {
    const response = await request(app)
      .post(REGISTER_URL)
      .send({ ...validUser(), email: 'not-an-email' });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('rejects registration with a password that is too short', async () => {
    const response = await request(app)
      .post(REGISTER_URL)
      .send({ ...validUser(), password: '123' });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('rejects registration when required fields are missing', async () => {
    const response = await request(app).post(REGISTER_URL).send({ email: uniqueEmail() });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('returns a conflict when the email is already registered', async () => {
    const user = validUser();

    await request(app).post(REGISTER_URL).send(user);
    const response = await request(app).post(REGISTER_URL).send(user);

    expect(response.status).toBe(StatusCodes.CONFLICT);
  });
});
