'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useMeeting } from '@/hooks/use-meeting';
import { useRecording } from '@/hooks/use-recording';
import { useRecordingUpload } from '@/hooks/use-recording-upload';
import { useRequireSession } from '@/hooks/use-require-session';

import { MeetingDetails } from './_components/meeting-details';
import { RecordingCard } from './_components/recording-card';

export default function MeetingPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const session = useRequireSession();
  const { meeting, error: meetingError } = useMeeting(session?.token, meetingId);
  const {
    recording,
    error: recordingError,
    setRecording,
  } = useRecording(session?.token, meetingId);
  const upload = useRecordingUpload({
    token: session?.token,
    meetingId,
    onUploaded: setRecording,
  });

  if (!session) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <nav>
        <Link
          className="text-muted hover:text-foreground inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline"
          data-testid="meeting-back-link"
          href="/dashboard"
        >
          ← К встречам
        </Link>
      </nav>

      {meetingError ? (
        <p className="text-danger" data-testid="meeting-error" role="alert">
          {meetingError}
        </p>
      ) : meeting ? (
        <>
          <MeetingDetails meeting={meeting} />
          <RecordingCard
            isUploading={upload.isUploading}
            loadError={recordingError}
            progress={upload.progress}
            recording={recording}
            uploadError={upload.error}
            onSelectFile={upload.selectFile}
          />
        </>
      ) : (
        <p aria-live="polite" className="text-muted" data-testid="meeting-loading" role="status">
          Загрузка встречи…
        </p>
      )}
    </main>
  );
}
