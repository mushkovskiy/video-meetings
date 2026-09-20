'use client';

import { Button, Card } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ApiError, getMeetings, type Meeting } from '@/lib/api';
import { clearSession, getProfile, getSession, type Session } from '@/lib/auth-storage';

const RECENT_MEETINGS_LIMIT = 3;

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function DashboardPage() {
  const router = useRouter();
  // undefined = session not read from localStorage yet (client-only API,
  // unavailable during SSR/hydration); null = checked, no session found.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const syncSession = () => setSession(getSession());
    syncSession();

    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  useEffect(() => {
    if (session === null) {
      router.replace('/login');
    }
  }, [router, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    getMeetings(session.token)
      .then((data) => {
        if (!cancelled) {
          setMeetings(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : 'Не удалось загрузить встречи.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session) {
    return null;
  }

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  const displayName = getProfile(session.email)?.firstName ?? session.email;
  const recentMeetings = meetings
    ? [...meetings]
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
        .slice(0, RECENT_MEETINGS_LIMIT)
    : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div data-testid="dashboard-welcome">
          <h1 className="text-xl font-semibold">Добро пожаловать, {displayName}!</h1>
          <p className="text-muted text-sm" data-testid="dashboard-email">
            {session.email}
          </p>
        </div>
        <Button data-testid="dashboard-logout-button" variant="secondary" onPress={handleLogout}>
          Выйти из аккаунта
        </Button>
      </header>

      <Card>
        <Card.Header>
          <Card.Title render={(props) => <h2 {...props} />}>Встречи</Card.Title>
          <Card.Description data-testid="dashboard-meetings-count">
            Всего встреч: {meetings ? meetings.length : '…'}
          </Card.Description>
        </Card.Header>

        <Card.Content>
          {loadError ? (
            <p className="text-danger" data-testid="dashboard-meetings-error" role="alert">
              {loadError}
            </p>
          ) : !meetings ? (
            <p
              aria-live="polite"
              className="text-muted"
              data-testid="dashboard-meetings-loading"
              role="status"
            >
              Загрузка встреч…
            </p>
          ) : recentMeetings.length === 0 ? (
            <p className="text-muted" data-testid="dashboard-meetings-empty">
              Встреч пока нет.
            </p>
          ) : (
            <ul className="flex flex-col gap-3" data-testid="dashboard-meetings-list">
              {recentMeetings.map((meeting) => (
                <li
                  className="border-default rounded-lg border p-3"
                  data-testid="dashboard-meeting-item"
                  key={meeting.id}
                >
                  <p className="font-medium">{meeting.title}</p>
                  <p className="text-muted text-sm">
                    {dateFormatter.format(new Date(meeting.scheduledAt))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card.Content>

        <Card.Footer>
          <Button data-testid="dashboard-create-meeting-button" fullWidth>
            Создать встречу
          </Button>
        </Card.Footer>
      </Card>
    </main>
  );
}
