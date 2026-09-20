import type { Meeting } from '@/lib/api';
import { formatMeetingDate } from '@/lib/meetings';

export function MeetingListItem({ meeting }: { meeting: Meeting }) {
  return (
    <li className="border-default rounded-lg border p-3" data-testid="dashboard-meeting-item">
      <p className="font-medium">{meeting.title}</p>
      <p className="text-muted text-sm">{formatMeetingDate(meeting.scheduledAt)}</p>
    </li>
  );
}
