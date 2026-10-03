import Link from 'next/link';

import type { Meeting } from '@/lib/api';
import { formatMeetingDate } from '@/lib/meetings';

export function MeetingListItem({ meeting }: { meeting: Meeting }) {
  return (
    <li data-testid="dashboard-meeting-item">
      <Link
        className="border-default hover:bg-default block rounded-lg border p-3 transition-colors"
        data-testid="dashboard-meeting-link"
        href={`/meetings/${meeting.id}`}
      >
        <p className="font-medium">{meeting.title}</p>
        <p className="text-muted text-sm">{formatMeetingDate(meeting.scheduledAt)}</p>
      </Link>
    </li>
  );
}
