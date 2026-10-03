'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { uploadRecording, type Recording } from '@/lib/api';
import { describeUploadError, validateRecordingFile } from '@/lib/recording';

export type RecordingUploadResult = {
  isUploading: boolean;
  progress: number;
  error: string | null;
  selectFile: (file: File) => void;
};

type UseRecordingUploadParams = {
  token: string | undefined;
  meetingId: string;
  onUploaded: (recording: Recording) => void;
};

// Validates the chosen file on the client and uploads it with progress.
// An invalid file is never sent — the reason is exposed through `error`.
export function useRecordingUpload({
  token,
  meetingId,
  onUploaded,
}: UseRecordingUploadParams): RecordingUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const selectFile = useCallback(
    (file: File) => {
      if (!token || abortRef.current) {
        return;
      }

      const validationError = validateRecordingFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);
      setProgress(0);
      setIsUploading(true);

      uploadRecording(token, meetingId, file, setProgress, controller.signal)
        .then(onUploaded)
        .catch((err: unknown) => {
          if (!controller.signal.aborted) {
            setError(describeUploadError(err));
          }
        })
        .finally(() => {
          abortRef.current = null;
          if (!controller.signal.aborted) {
            setIsUploading(false);
          }
        });
    },
    [token, meetingId, onUploaded],
  );

  return { isUploading, progress, error, selectFile };
}
