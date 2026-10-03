import { Label, ProgressBar } from '@heroui/react';

export function RecordingUploadProgress({ progress }: { progress: number }) {
  return (
    <ProgressBar aria-label="Загрузка записи" data-testid="recording-progress" value={progress}>
      <Label data-testid="recording-uploading-label">Загружается</Label>
      <ProgressBar.Output data-testid="recording-progress-value" />
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  );
}
