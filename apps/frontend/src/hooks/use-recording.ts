'use client';

import { useEffect, useState } from 'react';

import { getRecording, type Recording } from '@/lib/api';

export type RecordingResult = {
  // undefined = still loading; null = loaded, the meeting has no recording.
  recording: Recording | null | undefined;
  error: string | null;
  setRecording: (recording: Recording) => void;
};

// Loads the meeting's existing recording, so it shows up on open and after a reload.
export function useRecording(token: string | undefined, meetingId: string): RecordingResult {
  const [recording, setRecording] = useState<Recording | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    getRecording(token, meetingId)
      .then((data) => {
        if (!cancelled) {
          setRecording(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Не удалось загрузить запись.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, meetingId]);

  return { recording, error, setRecording };
}
