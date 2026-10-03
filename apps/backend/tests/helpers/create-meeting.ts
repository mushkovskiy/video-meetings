import type { Express } from 'express';
import request from 'supertest';

export const createMeeting = async (app: Express, token: string): Promise<string> => {
  const response = await request(app)
    .post('/meetings')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Sprint planning', scheduledAt: '2026-10-01T10:00:00.000Z' });

  return response.body.id as string;
};
