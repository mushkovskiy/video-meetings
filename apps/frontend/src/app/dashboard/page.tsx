'use client';

import { Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';

import { clearSession, getProfile, getSession } from '@/lib/auth-storage';

function subscribeToAuthChanges(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getGreetingSnapshot(): string | null {
  const session = getSession();
  if (!session) {
    return null;
  }

  const profile = getProfile(session.email);
  return profile?.firstName ?? session.email;
}

function getServerGreetingSnapshot(): string | null {
  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const greetingName = useSyncExternalStore(
    subscribeToAuthChanges,
    getGreetingSnapshot,
    getServerGreetingSnapshot,
  );

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
    }
  }, [router]);

  if (!greetingName) {
    return null;
  }

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold" data-testid="dashboard-welcome">
        Welcome, {greetingName}!
      </h1>
      <Button variant="secondary" onPress={handleLogout}>
        Log out
      </Button>
    </main>
  );
}
