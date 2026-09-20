import type { Meeting } from '@/lib/api';

const RECENT_MEETINGS_LIMIT = 3;

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatMeetingDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function selectRecentMeetings(meetings: Meeting[]): Meeting[] {
  return [...meetings]
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, RECENT_MEETINGS_LIMIT);
}
