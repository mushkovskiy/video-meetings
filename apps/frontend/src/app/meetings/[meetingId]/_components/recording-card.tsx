import { Alert, Card } from '@heroui/react';

import type { Recording } from '@/lib/api';

import { RecordingFilePicker } from './recording-file-picker';
import { RecordingMetadata } from './recording-metadata';
import { RecordingUploadProgress } from './recording-upload-progress';

type RecordingCardProps = {
  // undefined = still loading; null = the meeting has no recording yet.
  recording: Recording | null | undefined;
  loadError: string | null;
  isUploading: boolean;
  progress: number;
  uploadError: string | null;
  onSelectFile: (file: File) => void;
};

function RecordingBody({
  recording,
  loadError,
  isUploading,
  progress,
  onSelectFile,
}: Omit<RecordingCardProps, 'uploadError'>) {
  if (isUploading) {
    return <RecordingUploadProgress progress={progress} />;
  }

  if (recording) {
    return <RecordingMetadata recording={recording} />;
  }

  if (loadError) {
    return null;
  }

  if (recording === undefined) {
    return (
      <p aria-live="polite" className="text-muted" data-testid="recording-loading" role="status">
        Загрузка записи…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted" data-testid="recording-empty">
        Запись ещё не загружена.
      </p>
      <RecordingFilePicker onSelect={onSelectFile} />
    </div>
  );
}

export function RecordingCard({ loadError, uploadError, ...bodyProps }: RecordingCardProps) {
  const errorMessage = loadError ?? uploadError;

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-lg font-semibold" render={(props) => <h2 {...props} />}>
          Запись
        </Card.Title>
      </Card.Header>

      <Card.Content className="flex flex-col gap-4">
        {errorMessage && (
          <Alert data-testid="recording-error" role="alert" status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{errorMessage}</Alert.Title>
            </Alert.Content>
          </Alert>
        )}
        <RecordingBody loadError={loadError} {...bodyProps} />
      </Card.Content>
    </Card>
  );
}
