'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { useMeetings } from '@/hooks/use-meetings';
import { useRequireSession } from '@/hooks/use-require-session';
import { clearSession, getDisplayName } from '@/lib/auth-storage';

import { DashboardHeader } from './_components/dashboard-header';
import { MeetingsCard } from './_components/meetings-card';

export default function DashboardPage() {
  const router = useRouter();
  const session = useRequireSession();
  const { meetings, recentMeetings, error } = useMeetings(session?.token);

  const handleLogout = useCallback(() => {
    clearSession();
    router.replace('/login');
  }, [router]);

  if (!session) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-6">
      <DashboardHeader
        displayName={getDisplayName(session)}
        email={session.email}
        onLogout={handleLogout}
      />
      <MeetingsCard error={error} meetings={meetings} recentMeetings={recentMeetings} />
    </main>
  );
}
