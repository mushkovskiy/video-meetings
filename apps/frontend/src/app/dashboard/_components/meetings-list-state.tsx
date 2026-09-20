import type { Meeting } from '@/lib/api';

import { MeetingListItem } from './meeting-list-item';

type MeetingsListStateProps = {
  error: string | null;
  meetings: Meeting[] | null;
  recentMeetings: Meeting[];
};

export function MeetingsListState({ error, meetings, recentMeetings }: MeetingsListStateProps) {
  if (error) {
    return (
      <p className="text-danger" data-testid="dashboard-meetings-error" role="alert">
        {error}
      </p>
    );
  }

  if (!meetings) {
    return (
      <p
        aria-live="polite"
        className="text-muted"
        data-testid="dashboard-meetings-loading"
        role="status"
      >
        Загрузка встреч…
      </p>
    );
  }

  if (recentMeetings.length === 0) {
    return (
      <p className="text-muted" data-testid="dashboard-meetings-empty">
        Встреч пока нет.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3" data-testid="dashboard-meetings-list">
      {recentMeetings.map((meeting) => (
        <MeetingListItem key={meeting.id} meeting={meeting} />
      ))}
    </ul>
  );
}
