import { Card } from '@heroui/react';

import type { Meeting } from '@/lib/api';
import { formatMeetingDate } from '@/lib/meetings';

export function MeetingDetails({ meeting }: { meeting: Meeting }) {
  return (
    <Card>
      <Card.Header>
        <Card.Title
          className="text-2xl font-semibold"
          data-testid="meeting-title"
          render={(props) => <h1 {...props} />}
        >
          {meeting.title}
        </Card.Title>
        <Card.Description data-testid="meeting-date">
          {formatMeetingDate(meeting.scheduledAt)}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <p
          className={meeting.description ? undefined : 'text-muted'}
          data-testid="meeting-description"
        >
          {meeting.description || 'Описание не указано.'}
        </p>
      </Card.Content>
    </Card>
  );
}
