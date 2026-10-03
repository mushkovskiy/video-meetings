import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let directory: string | undefined;

// Points UPLOAD_DIRECTORY at a throwaway directory (and optionally lowers the
// recording size limit) so tests never write into the real uploads folder.
// Call before `createTestApp()` — `RestConfig` reads the env at construction.
export const startTestUploadDirectory = async (maxRecordingSize?: number): Promise<string> => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'vm-uploads-'));

  process.env.UPLOAD_DIRECTORY = directory;

  if (maxRecordingSize !== undefined) {
    process.env.UPLOAD_MAX_RECORDING_SIZE = String(maxRecordingSize);
  }

  return directory;
};

export const stopTestUploadDirectory = async (): Promise<void> => {
  if (directory) {
    await rm(directory, { recursive: true, force: true });
  }

  directory = undefined;
  delete process.env.UPLOAD_MAX_RECORDING_SIZE;
};
