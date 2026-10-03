'use client';

import { useEffect, useState } from 'react';

import { getMeeting, type Meeting } from '@/lib/api';
import { describeMeetingError } from '@/lib/recording';

export type MeetingResult = {
  meeting: Meeting | null;
  error: string | null;
};

// `token` is `undefined` while the session is still resolving — the fetch waits.
export function useMeeting(token: string | undefined, meetingId: string): MeetingResult {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    getMeeting(token, meetingId)
      .then((data) => {
        if (!cancelled) {
          setMeeting(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(describeMeetingError(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, meetingId]);

  return { meeting, error };
}
