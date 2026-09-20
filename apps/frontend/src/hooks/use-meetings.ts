'use client';

import { useEffect, useMemo, useState } from 'react';

import { ApiError, getMeetings, type Meeting } from '@/lib/api';
import { selectRecentMeetings } from '@/lib/meetings';

export type MeetingsResult = {
  meetings: Meeting[] | null;
  recentMeetings: Meeting[];
  error: string | null;
};

// Fetches the authenticated user's meetings and derives the "recent 3"
// view from them. `token` is `undefined` while the session is still
// resolving — the fetch simply waits.
export function useMeetings(token: string | undefined): MeetingsResult {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    getMeetings(token)
      .then((data) => {
        if (!cancelled) {
          setMeetings(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Не удалось загрузить встречи.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const recentMeetings = useMemo(
    () => (meetings ? selectRecentMeetings(meetings) : []),
    [meetings],
  );

  return { meetings, recentMeetings, error };
}
