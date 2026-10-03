import { Chip } from '@heroui/react';

import type { Recording, RecordingStatus } from '@/lib/api';
import { formatFileSize, formatUploadDate, RECORDING_STATUS_LABELS } from '@/lib/recording';

const STATUS_COLORS = {
  processing: 'warning',
  done: 'success',
  failed: 'danger',
} as const satisfies Record<RecordingStatus, 'warning' | 'success' | 'danger'>;

export function RecordingMetadata({ recording }: { recording: Recording }) {
  return (
    <div className="flex flex-col gap-3" data-testid="recording-metadata">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium break-all" data-testid="recording-name">
          {recording.originalName}
        </p>
        <Chip color={STATUS_COLORS[recording.status]} data-testid="recording-status" variant="soft">
          {RECORDING_STATUS_LABELS[recording.status]}
        </Chip>
      </div>
      <dl className="text-muted grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt>Размер</dt>
        <dd data-testid="recording-size">{formatFileSize(recording.size)}</dd>
        <dt>Загружена</dt>
        <dd data-testid="recording-uploaded-at">{formatUploadDate(recording.uploadedAt)}</dd>
      </dl>
    </div>
  );
}
