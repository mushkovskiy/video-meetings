import { expect, test, type Page } from '@playwright/test';

import { audioFile, registerUser, seedMeeting, signIn } from './support';

// The dev backend really tries to transcribe the dummy bytes and fails within a second;
// pin the reported status so these tests stay about the upload, not about the processing.
const keepProcessing = async (page: Page): Promise<void> => {
  await page.route('**/api/meetings/*/recording', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    const response = await route.fetch();
    if (response.status() !== 200) {
      await route.fulfill({ response });
      return;
    }
    const body = (await response.json()) as Record<string, unknown>;
    await route.fulfill({
      response,
      json: { ...body, status: 'processing', transcript: undefined, failureReason: undefined },
    });
  });
};

test.describe('Meeting page and recording upload', () => {
  test('opens a meeting from the dashboard', async ({ page }) => {
    const { meetingId } = await seedMeeting(page);

    await page.goto('/dashboard');
    await page.getByTestId('dashboard-meeting-link').first().click();

    await expect(page).toHaveURL(new RegExp(`/meetings/${meetingId}$`));
    await expect(page.getByTestId('meeting-title')).toHaveText('Планёрка по спринту');
    await expect(page.getByTestId('meeting-description')).toHaveText('Обсуждаем объём работ');
    await expect(page.getByTestId('meeting-date')).toBeVisible();
    await expect(page.getByTestId('recording-empty')).toBeVisible();
  });

  test('rejects an unsupported file format without sending it', async ({ page }) => {
    const { meetingId } = await seedMeeting(page);
    let uploadRequests = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/recording')) {
        uploadRequests += 1;
      }
    });

    await page.goto(`/meetings/${meetingId}`);
    await page.getByTestId('recording-file-input').setInputFiles({
      name: 'notes.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(128),
    });

    await expect(page.getByTestId('recording-error')).toContainText('Неподдерживаемый формат');
    await expect(page.getByTestId('recording-select-button')).toBeVisible();
    expect(uploadRequests).toBe(0);
  });

  test('uploads a valid file and keeps its metadata after a reload', async ({ page }) => {
    const { meetingId } = await seedMeeting(page);
    await keepProcessing(page);

    await page.goto(`/meetings/${meetingId}`);
    await page.getByTestId('recording-file-input').setInputFiles(audioFile('Встреча.mp3'));

    await expect(page.getByTestId('recording-name')).toHaveText('Встреча.mp3');
    await expect(page.getByTestId('recording-status')).toHaveText('В обработке');
    await expect(page.getByTestId('recording-size')).toHaveText('2 КБ');
    await expect(page.getByTestId('recording-uploaded-at')).toBeVisible();
    await expect(page.getByTestId('recording-select-button')).toHaveCount(0);

    await page.reload();

    await expect(page.getByTestId('recording-name')).toHaveText('Встреча.mp3');
    await expect(page.getByTestId('recording-status')).toHaveText('В обработке');
    await expect(page.getByTestId('recording-size')).toHaveText('2 КБ');
  });

  test('shows upload progress as a percentage while uploading', async ({ page }) => {
    const { meetingId } = await seedMeeting(page);

    // Hold the response so the "uploading" state stays on screen long enough to assert.
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/meetings/*/recording', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await gate;
      await route.continue();
    });

    await page.goto(`/meetings/${meetingId}`);
    await page.getByTestId('recording-file-input').setInputFiles(audioFile('long.mp3'));

    await expect(page.getByTestId('recording-uploading-label')).toHaveText('Загружается');
    await expect(page.getByTestId('recording-progress-value')).toContainText('%');

    release();
    await expect(page.getByTestId('recording-status')).toHaveText('В обработке');
  });

  test('shows the server message when the upload is rejected with 413', async ({ page }) => {
    const { meetingId } = await seedMeeting(page);

    await page.route('**/api/meetings/*/recording', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 413,
        contentType: 'application/json',
        body: JSON.stringify({ errorType: 'HTTP_ERROR', message: 'Файл больше 100 МБ' }),
      });
    });

    await page.goto(`/meetings/${meetingId}`);
    await page.getByTestId('recording-file-input').setInputFiles(audioFile('big.mp3'));

    await expect(page.getByTestId('recording-error')).toContainText('Файл больше 100 МБ');
    await expect(page.getByTestId('recording-select-button')).toBeVisible();
  });

  test("shows an error for another user's meeting", async ({ page }) => {
    const { meetingId } = await seedMeeting(page, false);
    await signIn(page, await registerUser(page, 'Jane'));

    await page.goto(`/meetings/${meetingId}`);

    await expect(page.getByTestId('meeting-error')).toContainText('нет доступа');
  });
});
