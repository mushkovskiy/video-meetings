'use client';

import { useEffect, useState } from 'react';

import { getRecording, type Recording } from '@/lib/api';

export const RECORDING_POLL_INTERVAL_MS = 3000;
const MAX_BACKOFF_STEPS = 3;

export type RecordingResult = {
  // undefined = still loading; null = loaded, the meeting has no recording.
  recording: Recording | null | undefined;
  error: string | null;
  setRecording: (recording: Recording | null) => void;
};

// Loads the meeting's existing recording, so it shows up on open and after a reload,
// and keeps refreshing it while the server is still processing it.
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

  const processingId = recording?.status === 'processing' ? recording.id : null;

  // Polling is a setTimeout chain rather than setInterval so requests never overlap.
  // It pauses while the tab is hidden and stops as soon as the status leaves `processing`
  // (the effect re-runs on the status change) or the page unmounts.
  useEffect(() => {
    if (!token || !processingId) {
      return;
    }

    let cancelled = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      const delay = RECORDING_POLL_INTERVAL_MS * 2 ** Math.min(failures, MAX_BACKOFF_STEPS);
      timer = setTimeout(poll, delay);
    };

    const poll = async () => {
      if (document.visibilityState === 'hidden') {
        return; // resumed by `handleVisibilityChange`
      }

      try {
        const data = await getRecording(token, meetingId);
        if (cancelled) {
          return;
        }
        failures = 0;
        setRecording(data);
        if (data?.status !== 'processing') {
          return;
        }
      } catch {
        // A failed poll must not wipe the status already on screen: back off and retry.
        if (cancelled) {
          return;
        }
        failures += 1;
      }

      schedule();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer);
        void poll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, meetingId, processingId]);

  return { recording, error, setRecording };
}
