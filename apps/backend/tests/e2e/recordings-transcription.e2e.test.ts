import { StatusCodes } from 'http-status-codes';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { AudioDecoder } from '../../src/shared/libs/audio/audio-decoder.interface.js';
import type { TranscriptionService } from '../../src/shared/libs/transcription/transcription-service.interface.js';
import { createMeeting } from '../helpers/create-meeting.js';
import { createTestApp } from '../helpers/create-test-app.js';
import { registerAndLogin } from '../helpers/register-and-login.js';
import { startTestDatabase, stopTestDatabase } from '../setup/mongo-memory-server.js';
import { startTestUploadDirectory, stopTestUploadDirectory } from '../setup/upload-directory.js';

const recordingUrl = (meetingId: string) => `/meetings/${meetingId}/recording`;

// A transcription fake settled by the test, so status transitions are deterministic.
const createControllableTranscription = () => {
  let resolveTranscript!: (text: string) => void;
  let rejectTranscript!: (error: Error) => void;

  const service: TranscriptionService = {
    transcribe: () =>
      new Promise<string>((resolve, reject) => {
        resolveTranscript = resolve;
        rejectTranscript = reject;
      }),
    warmUp: () => Promise.resolve(),
  };

  return {
    service,
    resolve: (text: string) => resolveTranscript(text),
    reject: (error: Error) => rejectTranscript(error),
  };
};

const instantDecoder: AudioDecoder = { decode: () => Promise.resolve(new Float32Array(16)) };

describe('recording transcription (e2e)', () => {
  const transcription = createControllableTranscription();
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    await startTestDatabase('recordings-transcription-e2e');
    await startTestUploadDirectory();
    app = createTestApp({
      audioDecoder: instantDecoder,
      transcriptionService: transcription.service,
    });
  });

  afterAll(async () => {
    await stopTestDatabase();
    await stopTestUploadDirectory();
  });

  const upload = async (token: string, meetingId: string) =>
    request(app)
      .post(recordingUrl(meetingId))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.alloc(64, 1), { filename: 'call.mp3', contentType: 'audio/mpeg' });

  const getRecording = (token: string, meetingId: string) =>
    request(app).get(recordingUrl(meetingId)).set('Authorization', `Bearer ${token}`);

  it('moves processing to done and exposes the transcript', async () => {
    const { token } = await registerAndLogin(app);
    const meetingId = await createMeeting(app, token);

    const uploadResponse = await upload(token, meetingId);

    expect(uploadResponse.status).toBe(StatusCodes.CREATED);
    expect(uploadResponse.body.status).toBe('processing');
    expect(uploadResponse.body).not.toHaveProperty('transcript');

    // The job starts in the background; wait until the fake has been asked to transcribe.
    await vi.waitFor(async () => {
      transcription.resolve('Привет, это тестовая транскрипция.');
      const response = await getRecording(token, meetingId);
      expect(response.body.status).toBe('done');
    });

    const response = await getRecording(token, meetingId);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.transcript).toBe('Привет, это тестовая транскрипция.');
    expect(response.body).not.toHaveProperty('failureReason');
  });

  it('moves processing to failed with a user-facing reason when transcription throws', async () => {
    const { token } = await registerAndLogin(app);
    const meetingId = await createMeeting(app, token);

    await upload(token, meetingId);

    await vi.waitFor(async () => {
      transcription.reject(new Error('model crashed'));
      const response = await getRecording(token, meetingId);
      expect(response.body.status).toBe('failed');
    });

    const response = await getRecording(token, meetingId);

    expect(response.body.failureReason).toBe('Не удалось распознать запись.');
    expect(response.body).not.toHaveProperty('transcript');
    expect(JSON.stringify(response.body)).not.toContain('model crashed');
  });

  it('lets a failed recording be uploaded again', async () => {
    const { token } = await registerAndLogin(app);
    const meetingId = await createMeeting(app, token);

    const first = await upload(token, meetingId);

    await vi.waitFor(async () => {
      transcription.reject(new Error('model crashed'));
      expect((await getRecording(token, meetingId)).body.status).toBe('failed');
    });

    const second = await upload(token, meetingId);

    expect(second.status).toBe(StatusCodes.CREATED);
    expect(second.body.id).not.toBe(first.body.id);
    expect(second.body.status).toBe('processing');
    expect((await getRecording(token, meetingId)).body.id).toBe(second.body.id);
  });

  it('moves processing to failed when the file cannot be decoded', async () => {
    const failingApp = createTestApp({
      audioDecoder: { decode: () => Promise.reject(new Error('ffmpeg exited with code 1')) },
      transcriptionService: transcription.service,
    });
    const { token } = await registerAndLogin(failingApp);
    const meetingId = await createMeeting(failingApp, token);

    await request(failingApp)
      .post(recordingUrl(meetingId))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.alloc(64, 1), { filename: 'broken.mp3', contentType: 'audio/mpeg' });

    await vi.waitFor(async () => {
      const response = await request(failingApp)
        .get(recordingUrl(meetingId))
        .set('Authorization', `Bearer ${token}`);
      expect(response.body.status).toBe('failed');
    });
  });

  it('does not expose the transcript of a foreign meeting', async () => {
    const owner = await registerAndLogin(app);
    const stranger = await registerAndLogin(app);
    const meetingId = await createMeeting(app, owner.token);

    await upload(owner.token, meetingId);
    await vi.waitFor(async () => {
      transcription.resolve('Секретный текст');
      expect((await getRecording(owner.token, meetingId)).body.status).toBe('done');
    });

    const response = await getRecording(stranger.token, meetingId);

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
    expect(JSON.stringify(response.body)).not.toContain('Секретный текст');
  });
});
