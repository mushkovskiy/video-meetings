import { expect, test, type Page } from '@playwright/test';

import { audioFile, seedMeeting } from './support';

type MockRecording = {
  status: 'processing' | 'done' | 'failed';
  transcript?: string;
  failureReason?: string;
};

const recordingBody = (overrides: MockRecording) => ({
  id: 'rec-1',
  originalName: 'Встреча.mp3',
  size: 2048,
  mimeType: 'audio/mpeg',
  uploadedAt: '2026-10-03T10:00:00.000Z',
  ...overrides,
});

// Answers `GET .../recording` with whatever `current()` returns, and counts the polls.
const mockRecording = async (page: Page, current: () => MockRecording) => {
  const counter = { gets: 0 };

  await page.route('**/api/meetings/*/recording', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    counter.gets += 1;
    await route.fulfill({ status: 200, json: recordingBody(current()) });
  });

  return counter;
};

test.describe('Recording processing status and transcript', () => {
  test('updates processing to done without a reload and shows the transcript', async ({ page }) => {
    const { meetingId } = await seedMeeting(page);
    let state: MockRecording = { status: 'processing' };
    await mockRecording(page, () => state);
    await page.clock.install();

    await page.goto(`/meetings/${meetingId}`);

    await expect(page.getByTestId('recording-status')).toHaveText('В обработке');
    await expect(page.getByTestId('recording-transcript')).toHaveCount(0);

    state = { status: 'done', transcript: 'Первая строка.\nВторая строка.' };
    await page.clock.runFor(3000);

    await expect(page.getByTestId('recording-status')).toHaveText('Готово');
    await expect(page.getByTestId('recording-transcript')).toHaveText(
      'Первая строка. Вторая строка.',
    );
    await expect(page.getByTestId('recording-processing-hint')).toHaveCount(0);
  });

  test('stops polling once the recording is done', async ({ page }) => {
    const { meetingId } = await seedMeeting(page);
    let state: MockRecording = { status: 'processing' };
    const counter = await mockRecording(page, () => state);
    await page.clock.install();

    await page.goto(`/meetings/${meetingId}`);
    await expect(page.getByTestId('recording-status')).toHaveText('В обработке');

    state = { status: 'done', transcript: 'Готовый текст' };
    await page.clock.runFor(3000);
    await expect(page.getByTestId('recording-status')).toHaveText('Готово');

    const getsWhenDone = counter.gets;
    await page.clock.runFor(30_000);

    expect(counter.gets).toBe(getsWhenDone);
  });

  test('shows the transcript right after a reload of a finished recording', async ({ page }) => {
    const { meetingId } = await seedMeeting(page);
    await mockRecording(page, () => ({ status: 'done', transcript: 'Текст после перезагрузки' }));

    await page.goto(`/meetings/${meetingId}`);
    await page.reload();

    await expect(page.getByTestId('recording-status')).toHaveText('Готово');
    await expect(page.getByTestId('recording-transcript')).toHaveText('Текст после перезагрузки');
  });

  test('keeps the status on screen when a poll fails', async ({ page }) => {
    const { meetingId } = await seedMeeting(page);
    let failing = false;

    await page.route('**/api/meetings/*/recording', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      if (failing) {
        await route.abort();
        return;
      }
      await route.fulfill({ status: 200, json: recordingBody({ status: 'processing' }) });
    });
    await page.clock.install();

    await page.goto(`/meetings/${meetingId}`);
    await expect(page.getByTestId('recording-status')).toHaveText('В обработке');

    failing = true;
    await page.clock.runFor(3000);

    await expect(page.getByTestId('recording-status')).toHaveText('В обработке');
    await expect(page.getByTestId('recording-error')).toHaveCount(0);
  });

  test('shows the error state and lets the user upload the file again', async ({ page }) => {
    const { meetingId } = await seedMeeting(page);
    let state: MockRecording = {
      status: 'failed',
      failureReason: 'Не удалось распознать запись.',
    };
    await mockRecording(page, () => state);
    await page.route('**/api/meetings/*/recording', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      state = { status: 'processing' };
      await route.fulfill({ status: 201, json: recordingBody(state) });
    });

    await page.goto(`/meetings/${meetingId}`);

    await expect(page.getByTestId('recording-status')).toHaveText('Ошибка');
    await expect(page.getByTestId('recording-failure')).toContainText(
      'Не удалось распознать запись.',
    );
    await expect(page.getByTestId('recording-select-button')).toHaveText('Загрузить заново');
    await expect(page.getByTestId('recording-transcript')).toHaveCount(0);

    await page.getByTestId('recording-file-input').setInputFiles(audioFile('Повтор.mp3'));

    await expect(page.getByTestId('recording-status')).toHaveText('В обработке');
    await expect(page.getByTestId('recording-failure')).toHaveCount(0);
  });
});
