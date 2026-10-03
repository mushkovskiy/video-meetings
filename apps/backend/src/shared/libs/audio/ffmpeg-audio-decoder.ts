import { spawn } from 'node:child_process';

import ffmpegPath from 'ffmpeg-static';
import { inject, injectable } from 'inversify';

import { Component } from '../../types/component.type.js';
import type { Config } from '../config/config.interface.js';
import type { RestSchema } from '../config/rest.schema.js';
import type { AudioDecoder } from './audio-decoder.interface.js';

const SAMPLE_RATE = 16000;
const STDERR_LIMIT = 4096;

@injectable()
export class FfmpegAudioDecoder implements AudioDecoder {
  constructor(@inject(Component.Config) private readonly config: Config<RestSchema>) {}

  private resolveBinary(): string {
    const binary = this.config.get('FFMPEG_PATH') || (ffmpegPath as unknown as string | null);

    if (!binary) {
      throw new Error('ffmpeg binary is not available. Set FFMPEG_PATH.');
    }

    return binary;
  }

  public decode(filePath: string, signal?: AbortSignal): Promise<Float32Array> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(
        this.resolveBinary(),
        [
          '-nostdin',
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          filePath,
          '-vn',
          '-ac',
          '1',
          '-ar',
          String(SAMPLE_RATE),
          '-f',
          'f32le',
          'pipe:1',
        ],
        { signal },
      );

      const chunks: Buffer[] = [];
      let stderr = '';

      ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      ffmpeg.stderr.on('data', (chunk: Buffer) => {
        if (stderr.length < STDERR_LIMIT) {
          stderr += chunk.toString();
        }
      });
      ffmpeg.on('error', reject);
      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim()}`));
          return;
        }

        const buffer = Buffer.concat(chunks);
        // Copy into a fresh, aligned ArrayBuffer — Buffer slices may be unaligned.
        const samples = new Float32Array(
          Math.floor(buffer.length / Float32Array.BYTES_PER_ELEMENT),
        );
        new Uint8Array(samples.buffer).set(buffer.subarray(0, samples.byteLength));
        resolve(samples);
      });
    });
  }
}
