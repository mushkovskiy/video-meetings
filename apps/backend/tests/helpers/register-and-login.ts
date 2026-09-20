import request from 'supertest';
import type { Express } from 'express';

const REGISTER_URL = '/users/register';
const LOGIN_URL = '/users/login';

let uniqueEmailCounter = 0;
const uniqueEmail = () => `meeting-owner.${++uniqueEmailCounter}@example.com`;

export interface AuthenticatedUser {
  email: string;
  token: string;
}

export const registerAndLogin = async (app: Express): Promise<AuthenticatedUser> => {
  const email = uniqueEmail();
  const password = 'super-secret-1';

  await request(app).post(REGISTER_URL).send({
    email,
    firstName: 'Meeting',
    lastName: 'Owner',
    password,
  });

  const response = await request(app).post(LOGIN_URL).send({ email, password });

  return { email, token: response.body.token as string };
};
