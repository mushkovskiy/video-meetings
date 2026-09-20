'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import type { Session } from '@/lib/auth-storage';

import { useSession } from './use-session';

// Redirects to /login once we've confirmed there's no session, without
// disturbing the render while that check is still in flight (session
// undefined). Pages consume the returned session directly.
export function useRequireSession(): Session | null | undefined {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session === null) {
      router.replace('/login');
    }
  }, [router, session]);

  return session;
}
