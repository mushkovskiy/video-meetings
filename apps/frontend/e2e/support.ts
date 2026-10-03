import type { Page } from '@playwright/test';

const PASSWORD = 'super-secret-1';
const TOKEN_KEY = 'video-meetings:auth:token';
const EMAIL_KEY = 'video-meetings:auth:email';

const uniqueEmail = () =>
  `recording.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;

export type User = { email: string; token: string };

export const registerUser = async (page: Page, firstName: string): Promise<User> => {
  const email = uniqueEmail();

  await page.request.post('/api/users/register', {
    data: { email, firstName, lastName: 'Smith', password: PASSWORD },
  });
  const login = await page.request.post('/api/users/login', {
    data: { email, password: PASSWORD },
  });
  const { token } = (await login.json()) as { token: string };

  return { email, token };
};

// Signs the browser in by seeding the session into localStorage before the app loads.
export const signIn = async (page: Page, { email, token }: User): Promise<void> => {
  await page.addInitScript(
    ([tokenKey, emailKey, tokenValue, emailValue]) => {
      localStorage.setItem(tokenKey, tokenValue);
      localStorage.setItem(emailKey, emailValue);
    },
    [TOKEN_KEY, EMAIL_KEY, token, email],
  );
};

// Registers a user and creates a meeting through the API (via the Next.js /api
// proxy). Signs the browser in as that user unless `withSession` is false.
export const seedMeeting = async (
  page: Page,
  withSession = true,
): Promise<{ meetingId: string }> => {
  const owner = await registerUser(page, 'John');

  const meeting = await page.request.post('/api/meetings', {
    headers: { Authorization: `Bearer ${owner.token}` },
    data: {
      title: 'Планёрка по спринту',
      description: 'Обсуждаем объём работ',
      scheduledAt: '2026-10-01T10:00:00.000Z',
    },
  });
  const { id: meetingId } = (await meeting.json()) as { id: string };

  if (withSession) {
    await signIn(page, owner);
  }

  return { meetingId };
};

export const audioFile = (name: string, mimeType = 'audio/mpeg') => ({
  name,
  mimeType,
  buffer: Buffer.alloc(2048, 1),
});
