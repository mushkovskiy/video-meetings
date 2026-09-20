'use client';

import { useEffect, useState } from 'react';

import { getSession, type Session } from '@/lib/auth-storage';

// undefined = session not read from localStorage yet (client-only API,
// unavailable during SSR/hydration); null = checked, no session found.
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const syncSession = () => setSession(getSession());
    syncSession();

    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  return session;
}
