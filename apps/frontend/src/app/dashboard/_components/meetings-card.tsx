import { Button, Card } from '@heroui/react';

import type { Meeting } from '@/lib/api';

import { MeetingsListState } from './meetings-list-state';

type MeetingsCardProps = {
  error: string | null;
  meetings: Meeting[] | null;
  recentMeetings: Meeting[];
};

export function MeetingsCard({ error, meetings, recentMeetings }: MeetingsCardProps) {
  return (
    <Card>
      <Card.Header>
        <Card.Title render={(props) => <h2 {...props} />}>Встречи</Card.Title>
        <Card.Description data-testid="dashboard-meetings-count">
          Всего встреч: {meetings ? meetings.length : '…'}
        </Card.Description>
      </Card.Header>

      <Card.Content>
        <MeetingsListState error={error} meetings={meetings} recentMeetings={recentMeetings} />
      </Card.Content>

      <Card.Footer>
        <Button data-testid="dashboard-create-meeting-button" fullWidth>
          Создать встречу
        </Button>
      </Card.Footer>
    </Card>
  );
}
