import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FfmpegAudioDecoder } from '../../src/shared/libs/audio/ffmpeg-audio-decoder.js';
import type { Config } from '../../src/shared/libs/config/config.interface.js';
import type { RestSchema } from '../../src/shared/libs/config/rest.schema.js';

const config = { get: () => '' } as unknown as Config<RestSchema>;

// 8 kHz mono 16-bit PCM WAV with one second of a quiet sine wave.
const createWav = (): Buffer => {
  const sampleRate = 8000;
  const samples = Buffer.alloc(sampleRate * 2);

  for (let i = 0; i < sampleRate; i++) {
    samples.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 3000), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + samples.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(samples.length, 40);

  return Buffer.concat([header, samples]);
};

describe('FfmpegAudioDecoder', () => {
  const decoder = new FfmpegAudioDecoder(config);
  let directory: string;

  beforeAll(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'vm-decoder-'));
  });

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('decodes a file into 16 kHz mono samples', async () => {
    const file = path.join(directory, 'tone.wav');
    await writeFile(file, createWav());

    const samples = await decoder.decode(file);

    // One second of audio resampled to 16 kHz.
    expect(samples.length).toBeGreaterThan(15000);
    expect(samples.length).toBeLessThan(17000);
    expect(samples.some((value) => Math.abs(value) > 0.01)).toBe(true);
  });

  it('rejects a file that is not valid audio', async () => {
    const file = path.join(directory, 'broken.mp3');
    await writeFile(file, Buffer.alloc(256, 7));

    await expect(decoder.decode(file)).rejects.toThrow(/ffmpeg exited/);
  });
});
